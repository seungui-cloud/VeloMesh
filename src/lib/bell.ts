import { AudioSession } from '@livekit/react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

/**
 * Phone Bell (기획서 21~24장).
 * - 서버·네트워크 무관, 로컬 재생 (지연 최소화 위해 플레이어 사전 로드)
 * - 기획서 24장: Bluetooth 이어폰이 연결되어 있어도 벨은 "본체 스피커"로 크게.
 *   재생 직전에 오디오 라우팅을 스피커로 강제하고, 벨이 끝나면 원래대로
 *   복원한다 (통화 중이면 통화 음성이 잠깐 스피커로 나왔다가 돌아옴).
 */
const BELL_MS = 1900;

const player = createAudioPlayer(require('../../assets/sounds/bell.wav'));
player.volume = 1;

let audioModeReady = false;
let restoreTimer: ReturnType<typeof setTimeout> | null = null;

export async function prepareBell(): Promise<void> {
  if (audioModeReady) return;
  audioModeReady = true;
  await setAudioModeAsync({
    playsInSilentMode: true, // iOS 무음 스위치 무시
    interruptionMode: 'mixWithOthers',
  }).catch(() => {});
}

/** 본체 스피커로 강제 라우팅 (BT 이어폰 연결 중에도) */
async function forceSpeaker(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      // allowBluetooth* 옵션을 제외하면 본체 스피커로 라우팅됨
      await AudioSession.setAppleAudioConfiguration({
        audioCategory: 'playAndRecord',
        audioCategoryOptions: ['defaultToSpeaker', 'mixWithOthers'],
        audioMode: 'videoChat',
      });
    } else {
      await AudioSession.selectAudioOutput('speaker');
    }
  } catch {
    // 라우팅 실패해도 벨은 재생 (현재 출력 장치로)
  }
}

/** 원래 라우팅(BT 이어폰 등) 복원 */
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
      if (outputs.includes('bluetooth')) {
        await AudioSession.selectAudioOutput('bluetooth');
      } else if (outputs.includes('headset')) {
        await AudioSession.selectAudioOutput('headset');
      }
    }
  } catch {
    // 복원 실패는 무시 (다음 통화 시작 시 LiveKit이 재설정)
  }
}

export function playBell(): void {
  prepareBell();
  forceSpeaker().finally(() => {
    player.seekTo(0);
    player.play();
  });
  if (restoreTimer) clearTimeout(restoreTimer);
  restoreTimer = setTimeout(() => {
    restoreTimer = null;
    restoreRoute();
  }, BELL_MS);
}
