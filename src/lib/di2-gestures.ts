import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Di2 히든버튼 제스처 판별 엔진 v3 — 샘플 유사도 분류.
 *
 * 실물 관찰 (RD-R8150, characteristic 2ac2, 5바이트):
 *   오른쪽: 22 11 12 f0 f0 / 23 11 43 f0 f0 / 24 11 44 f0 f0
 *   왼쪽:   2e 49 44 f0 f0 / 2f 4a 44 f0 f0 / 20 1b 44 f0 f0
 *   2ac1:   동일 payload 주기 반복 = 상태 방송 노이즈
 *
 * 특징:
 * - 일부 바이트는 매번 변하는 카운터 → 정확 매칭 불가
 * - 좌/우 패턴이 부분적으로 겹칠 수 있음 → 고정 마스크도 불안정
 * - 한 번 누름에 이벤트가 여러 개(누름/뗌 등) 연달아 올 수 있음
 *
 * 접근:
 * 1. 학습: 버튼을 여러 번 눌러 원시 샘플을 그대로 저장
 * 2. 분류: 새 이벤트를 좌/우 샘플들과 바이트 단위 비교, 최고 일치 쪽으로 판별
 *    (동점이면 무시 — 오작동보다 무반응이 안전)
 * 3. 버스트: 같은 쪽 이벤트가 BURST_MS 내 연달아 오면 한 번의 누름으로 묶음
 * 4. 제스처: 누름(버스트) 완료 후 DOUBLE_MS 내 재누름 → 2번, 아니면 1번
 */

export type ButtonSide = 'left' | 'right';
export type GestureKind = 'single' | 'double';

export interface ButtonProfile {
  charUUID: string;
  length: number;
  samples: number[][];
}

export type ButtonMap = Partial<Record<ButtonSide, ButtonProfile>>;

export interface Gesture {
  side: ButtonSide;
  kind: GestureKind;
  ts: number;
}

const STORAGE_KEY = 'di2-button-map-v3';
const BURST_MS = 400; // 같은 쪽 연속 이벤트를 한 번의 누름으로 묶는 창
const DOUBLE_MS = 600; // 누름 완료 후 재누름 대기 (2번 판별)
const LEARN_MIN_SAMPLES = 3;
const LEARN_IDLE_DONE_MS = 2000; // 마지막 신호 후 이 시간 지나면 학습 확정
const LEARN_TIMEOUT_MS = 12000;
const MAX_SAMPLES_PER_SIDE = 12;
/** 같은 신호가 이 횟수 이상 반복되면 주기적 노이즈로 간주 */
export const NOISE_REPEAT_THRESHOLD = 3;

export function parseHexBytes(hex: string): number[] {
  return hex
    .trim()
    .split(/\s+/)
    .map((b) => parseInt(b, 16))
    .filter((n) => !Number.isNaN(n));
}

export async function loadButtonMap(): Promise<ButtonMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ButtonMap) : {};
  } catch {
    return {};
  }
}

export async function saveButtonMap(map: ButtonMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

interface LearnState {
  side: ButtonSide;
  samples: { charUUID: string; bytes: number[] }[];
  idleTimer: ReturnType<typeof setTimeout> | null;
  hardTimer: ReturnType<typeof setTimeout>;
}

interface BurstState {
  startTs: number;
  timer: ReturnType<typeof setTimeout>;
}

export class Di2GestureEngine {
  private map: ButtonMap = {};
  private seenCounts = new Map<string, number>();
  private burst = new Map<ButtonSide, BurstState>();
  private doubleWait = new Map<ButtonSide, ReturnType<typeof setTimeout>>();
  private learning: LearnState | null = null;

  constructor(
    private onGesture: (g: Gesture) => void,
    private onLearned: (side: ButtonSide, ok: boolean, message: string) => void,
    private onLearnProgress: (side: ButtonSide, count: number) => void,
  ) {}

  setMap(map: ButtonMap) {
    this.map = map;
  }

  getMap(): ButtonMap {
    return this.map;
  }

  isNoise(charUUID: string, hex: string): boolean {
    return (this.seenCounts.get(`${charUUID}:${hex}`) ?? 0) >= NOISE_REPEAT_THRESHOLD;
  }

  startLearning(side: ButtonSide) {
    this.cancelLearning();
    const hardTimer = setTimeout(() => this.finishLearning(), LEARN_TIMEOUT_MS);
    this.learning = { side, samples: [], idleTimer: null, hardTimer };
  }

  cancelLearning() {
    if (this.learning) {
      clearTimeout(this.learning.hardTimer);
      if (this.learning.idleTimer) clearTimeout(this.learning.idleTimer);
    }
    this.learning = null;
  }

  isLearning(): ButtonSide | null {
    return this.learning?.side ?? null;
  }

  private finishLearning() {
    const l = this.learning;
    if (!l) return;
    this.cancelLearning();

    if (l.samples.length < LEARN_MIN_SAMPLES) {
      this.onLearned(l.side, false, '샘플이 부족합니다. 다시 학습을 시작하고 버튼을 5번 눌러주세요.');
      return;
    }

    const profile: ButtonProfile = {
      charUUID: l.samples[0].charUUID,
      length: l.samples[0].bytes.length,
      samples: l.samples.map((s) => s.bytes).slice(0, MAX_SAMPLES_PER_SIDE),
    };
    this.map = { ...this.map, [l.side]: profile };
    saveButtonMap(this.map);
    this.onLearned(l.side, true, `등록 완료 (샘플 ${profile.samples.length}개)`);
  }

  /** 프로필 샘플들과의 최대 바이트 일치 수 */
  private score(profile: ButtonProfile, charUUID: string, bytes: number[]): number {
    if (profile.charUUID !== charUUID || profile.length !== bytes.length) return -1;
    let best = 0;
    for (const s of profile.samples) {
      let m = 0;
      for (let i = 0; i < bytes.length; i++) if (s[i] === bytes[i]) m++;
      if (m > best) best = m;
    }
    return best;
  }

  /** BLE 이벤트 수신. 버튼/학습으로 소비되면 true. */
  feed(charUUID: string, hex: string, ts: number): boolean {
    const exact = `${charUUID}:${hex}`;
    this.seenCounts.set(exact, (this.seenCounts.get(exact) ?? 0) + 1);
    const bytes = parseHexBytes(hex);

    if (this.learning) {
      const l = this.learning;
      if (this.isNoise(charUUID, hex)) return false;
      if (l.samples.length > 0) {
        const first = l.samples[0];
        if (first.charUUID !== charUUID || first.bytes.length !== bytes.length) return false;
      }
      l.samples.push({ charUUID, bytes });
      this.onLearnProgress(l.side, l.samples.length);
      if (l.idleTimer) clearTimeout(l.idleTimer);
      l.idleTimer = setTimeout(() => this.finishLearning(), LEARN_IDLE_DONE_MS);
      return true;
    }

    // 노이즈는 분류 대상에서 제외
    if (this.isNoise(charUUID, hex)) return false;

    const left = this.map.left ? this.score(this.map.left, charUUID, bytes) : -1;
    const right = this.map.right ? this.score(this.map.right, charUUID, bytes) : -1;
    const best = Math.max(left, right);
    if (best < 0) return false;
    // 길이의 절반 이상은 일치해야 버튼으로 인정
    if (best < Math.ceil(bytes.length / 2)) return false;
    if (left === right) return false; // 동점 = 판별 불가 → 무시 (오작동 방지)

    const side: ButtonSide = left > right ? 'left' : 'right';
    this.handleEvent(side, ts);
    return true;
  }

  /** 같은 쪽 연속 이벤트를 버스트(한 번의 누름)로 묶는다 */
  private handleEvent(side: ButtonSide, ts: number) {
    const b = this.burst.get(side);
    if (b) {
      clearTimeout(b.timer);
      b.timer = setTimeout(() => this.completeBurst(side), BURST_MS);
      return;
    }
    const timer = setTimeout(() => this.completeBurst(side), BURST_MS);
    this.burst.set(side, { startTs: ts, timer });
  }

  private completeBurst(side: ButtonSide) {
    const b = this.burst.get(side);
    this.burst.delete(side);
    if (!b) return;

    const pending = this.doubleWait.get(side);
    if (pending) {
      clearTimeout(pending);
      this.doubleWait.delete(side);
      this.onGesture({ side, kind: 'double', ts: b.startTs });
      return;
    }
    const timer = setTimeout(() => {
      this.doubleWait.delete(side);
      this.onGesture({ side, kind: 'single', ts: b.startTs });
    }, DOUBLE_MS);
    this.doubleWait.set(side, timer);
  }

  dispose() {
    this.cancelLearning();
    for (const t of this.doubleWait.values()) clearTimeout(t);
    for (const b of this.burst.values()) clearTimeout(b.timer);
    this.doubleWait.clear();
    this.burst.clear();
  }
}

export const GESTURE_LABEL: Record<GestureKind, string> = {
  single: '짧게 1번',
  double: '2번 연속',
};

export const SIDE_LABEL: Record<ButtonSide, string> = {
  left: '왼쪽',
  right: '오른쪽',
};
