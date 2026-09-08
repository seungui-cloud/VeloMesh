import { AudioSession } from '@livekit/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

import { ButtonSide, GestureKind } from './di2-gestures';

/**
 * Phone Bell 사운드 세트 (기획서 21~25장).
 * - 벨 외에 음성 안내("지나가겠습니다", "추월합니다"), 경고음 제공
 * - 모두 로컬 재생, BT 이어폰 연결 중에도 본체 스피커로 강제 출력
 * - Di2 제스처(왼/오 × 1번/2번)별로 소리를 매핑할 수 있다
 */

export type SoundId = 'bell' | 'chime' | 'passing' | 'overtake' | 'thanks' | 'warn';

export const SOUNDS: { id: SoundId; emoji: string; label: string }[] = [
  { id: 'bell', emoji: '🔔', label: '따르릉' },
  { id: 'chime', emoji: '🛎️', label: '딩동' },
  { id: 'passing', emoji: '🗣️', label: '지나가겠습니다' },
  { id: 'overtake', emoji: '🗣️', label: '추월합니다' },
  { id: 'thanks', emoji: '🗣️', label: '감사합니다' },
  { id: 'warn', emoji: '📢', label: '경고음' },
];

export function soundLabel(id: SoundId): string {
  const s = SOUNDS.find((x) => x.id === id);
  return s ? `${s.emoji} ${s.label}` : id;
}

const players: Record<SoundId, AudioPlayer> = {
  bell: createAudioPlayer(require('../../assets/sounds/bell.wav')),
  chime: createAudioPlayer(require('../../assets/sounds/chime.wav')),
  passing: createAudioPlayer(require('../../assets/sounds/passing.wav')),
  overtake: createAudioPlayer(require('../../assets/sounds/overtake.wav')),
  thanks: createAudioPlayer(require('../../assets/sounds/thanks.wav')),
  warn: createAudioPlayer(require('../../assets/sounds/warn.wav')),
};
for (const p of Object.values(players)) p.volume = 1;

const RESTORE_MS = 2200;
let audioModeReady = false;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

export async function prepareSounds(): Promise<void> {
  if (audioModeReady) return;
  audioModeReady = true;
  await setAudioModeAsync({
    playsInSilentMode: true, // iOS 무음 스위치 무시
    interruptionMode: 'mixWithOthers',
  }).catch(() => {});
}

/** 본체 스피커 강제 (기획서 24장: BT 이어폰 연결 중에도 스피커) */
async function forceSpeaker(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await AudioSession.setAppleAudioConfiguration({
        audioCategory: 'playAndRecord',
        audioCategoryOptions: ['defaultToSpeaker', 'mixWithOthers'],
        audioMode: 'videoChat',
      });
    } else {
      await AudioSession.selectAudioOutput('speaker');
    }
  } catch {
    // 라우팅 실패 시 현재 출력으로라도 재생
  }
}

async function restoreRoute(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await AudioSession.setAppleAudioConfiguration({
        audioCategory: 'playAndRecord',
        audioCategoryOptions: [
          'defaultToSpeaker',
          'allowBluetooth',
          'allowBluetoothA2DP',
          'mixWithOthers',
        ],
        audioMode: 'voiceChat',
      });
    } else {
      const outputs = await AudioSession.getAudioOutputs();
      if (outputs.includes('bluetooth')) await AudioSession.selectAudioOutput('bluetooth');
      else if (outputs.includes('headset')) await AudioSession.selectAudioOutput('headset');
    }
  } catch {
    // 복원 실패 무시 (다음 통화 시작 시 LiveKit이 재설정)
  }
}

export function playSound(id: SoundId): void {
  prepareSounds();
  const player = players[id];
  forceSpeaker().finally(() => {
    player.seekTo(0);
    player.play();
  });
  if (restoreTimer) clearTimeout(restoreTimer);
  restoreTimer = setTimeout(() => {
    restoreTimer = null;
    restoreRoute();
  }, RESTORE_MS);
}

/** 호환용 별칭 */
export const playBell = () => playSound('bell');
export const prepareBell = prepareSounds;

// ── Di2 제스처 → 사운드 매핑 ─────────────────────────────

export type GestureKey = `${ButtonSide}-${GestureKind}`;
export type GestureSoundMap = Record<GestureKey, SoundId>;

export const DEFAULT_GESTURE_MAP: GestureSoundMap = {
  'left-single': 'bell',
  'left-double': 'passing',
  'right-single': 'overtake',
  'right-double': 'warn',
};

export const GESTURE_KEY_LABEL: Record<GestureKey, string> = {
  'left-single': '왼쪽 짧게 1번',
  'left-double': '왼쪽 2번 연속',
  'right-single': '오른쪽 짧게 1번',
  'right-double': '오른쪽 2번 연속',
};

const MAP_STORAGE_KEY = 'gesture-sound-map';

export async function loadGestureSoundMap(): Promise<GestureSoundMap> {
  try {
    const raw = await AsyncStorage.getItem(MAP_STORAGE_KEY);
    return raw ? { ...DEFAULT_GESTURE_MAP, ...(JSON.parse(raw) as GestureSoundMap) } : DEFAULT_GESTURE_MAP;
  } catch {
    return DEFAULT_GESTURE_MAP;
  }
}

export async function saveGestureSoundMap(map: GestureSoundMap): Promise<void> {
  await AsyncStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(map));
}

/** 다음 사운드로 순환 (매핑 설정 UI용) */
export function nextSound(id: SoundId): SoundId {
  const idx = SOUNDS.findIndex((s) => s.id === id);
  return SOUNDS[(idx + 1) % SOUNDS.length].id;
}
