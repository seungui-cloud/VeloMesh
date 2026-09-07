import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Di2 히든버튼 제스처 판별 엔진 (가민 방식과 동일한 수신측 타이밍 판별).
 *
 * 학습: "왼쪽/오른쪽 버튼 학습"을 누른 뒤 실제 버튼을 한 번 누르면,
 * 학습 창(1.2초) 동안 수신된 신호 시그니처(char UUID + hex)를 그 버튼의
 * press(첫 신호)/release(다른 신호가 있으면)로 기억한다.
 *
 * 판별:
 * - press→release 시간 ≥ LONG_MS  → 길게
 * - 짧은 누름 후 DOUBLE_MS 안에 또 누름 → 2번
 * - 그 외 → 짧게
 * - release 신호가 없는 프로토콜이면 길게는 판별 불가(짧게/2번만)
 */

export type ButtonSide = 'left' | 'right';
export type GestureKind = 'single' | 'double' | 'long';

export interface ButtonSignature {
  press: string;
  release?: string;
}

export type ButtonMap = Partial<Record<ButtonSide, ButtonSignature>>;

export interface Gesture {
  side: ButtonSide;
  kind: GestureKind;
  ts: number;
}

const STORAGE_KEY = 'di2-button-map';
const LONG_MS = 600;
const DOUBLE_MS = 400;
const LEARN_WINDOW_MS = 1200;

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

/** 신호 시그니처: characteristic UUID + payload hex */
export function signatureOf(charUUID: string, hex: string): string {
  return `${charUUID}:${hex}`;
}

interface PendingState {
  pressTs: number;
  /** 짧은 누름 1회가 끝나고 더블 대기 중인지 */
  waitingDouble: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

export class Di2GestureEngine {
  private map: ButtonMap = {};
  private pending = new Map<ButtonSide, PendingState>();
  private learning: { side: ButtonSide; sigs: string[]; timer: ReturnType<typeof setTimeout> } | null =
    null;

  constructor(
    private onGesture: (g: Gesture) => void,
    private onLearned: (side: ButtonSide, sig: ButtonSignature) => void,
  ) {}

  setMap(map: ButtonMap) {
    this.map = map;
  }

  getMap(): ButtonMap {
    return this.map;
  }

  /** 학습 모드 시작: 다음 수신 신호들을 해당 버튼으로 등록 */
  startLearning(side: ButtonSide) {
    if (this.learning) clearTimeout(this.learning.timer);
    const timer = setTimeout(() => this.finishLearning(), LEARN_WINDOW_MS * 2);
    this.learning = { side, sigs: [], timer };
  }

  cancelLearning() {
    if (this.learning) clearTimeout(this.learning.timer);
    this.learning = null;
  }

  isLearning(): ButtonSide | null {
    return this.learning?.side ?? null;
  }

  private finishLearning() {
    if (!this.learning) return;
    const { side, sigs } = this.learning;
    this.learning = null;
    if (sigs.length === 0) return;
    const sig: ButtonSignature = { press: sigs[0] };
    const release = sigs.find((s) => s !== sigs[0]);
    if (release) sig.release = release;
    this.map = { ...this.map, [side]: sig };
    saveButtonMap(this.map);
    this.onLearned(side, sig);
  }

  /** BLE 이벤트 수신 시 호출. 등록된 버튼 신호였으면 true를 반환. */
  feed(charUUID: string, hex: string, ts: number): boolean {
    const sig = signatureOf(charUUID, hex);

    if (this.learning) {
      const l = this.learning;
      if (!l.sigs.includes(sig)) l.sigs.push(sig);
      // 첫 신호 수신 후 학습 창만큼 기다렸다가 확정
      clearTimeout(l.timer);
      l.timer = setTimeout(() => this.finishLearning(), LEARN_WINDOW_MS);
      return true;
    }

    for (const side of ['left', 'right'] as ButtonSide[]) {
      const btn = this.map[side];
      if (!btn) continue;
      if (sig === btn.press) {
        this.handlePress(side, ts, !!btn.release);
        return true;
      }
      if (btn.release && sig === btn.release) {
        this.handleRelease(side, ts);
        return true;
      }
    }
    return false;
  }

  private emit(side: ButtonSide, kind: GestureKind, ts: number) {
    this.onGesture({ side, kind, ts });
  }

  private handlePress(side: ButtonSide, ts: number, hasRelease: boolean) {
    const p = this.pending.get(side);

    if (p?.waitingDouble) {
      // 짧은 누름 후 재누름 → 2번
      if (p.timer) clearTimeout(p.timer);
      this.pending.delete(side);
      this.emit(side, 'double', ts);
      return;
    }

    if (!hasRelease) {
      // release 신호가 없는 프로토콜: 누름 = 완결. 더블 대기만 수행.
      const timer = setTimeout(() => {
        this.pending.delete(side);
        this.emit(side, 'single', ts);
      }, DOUBLE_MS);
      this.pending.set(side, { pressTs: ts, waitingDouble: true, timer });
      return;
    }

    // release를 기다림 (길게 판별용)
    this.pending.set(side, { pressTs: ts, waitingDouble: false, timer: null });
  }

  private handleRelease(side: ButtonSide, ts: number) {
    const p = this.pending.get(side);
    if (!p || p.waitingDouble) return;

    if (ts - p.pressTs >= LONG_MS) {
      this.pending.delete(side);
      this.emit(side, 'long', ts);
      return;
    }

    // 짧은 누름 완료 → 더블 대기
    const timer = setTimeout(() => {
      this.pending.delete(side);
      this.emit(side, 'single', p.pressTs);
    }, DOUBLE_MS);
    this.pending.set(side, { pressTs: p.pressTs, waitingDouble: true, timer });
  }

  dispose() {
    this.cancelLearning();
    for (const p of this.pending.values()) if (p.timer) clearTimeout(p.timer);
    this.pending.clear();
  }
}

export const GESTURE_LABEL: Record<GestureKind, string> = {
  single: '짧게 1번',
  double: '2번 연속',
  long: '길게',
};

export const SIDE_LABEL: Record<ButtonSide, string> = {
  left: '왼쪽',
  right: '오른쪽',
};
