import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

/**
 * Phone Bell (기획서 21~24장).
 * Di2 히든버튼 → 로컬 오디오 재생. 서버·네트워크 무관, 최대한 즉각적으로.
 * 플레이어를 모듈 로드 시점에 만들어 두어 재생 지연을 최소화한다 (목표 100ms 이하).
 */
const player = createAudioPlayer(require('../../assets/sounds/bell.wav'));
player.volume = 1;

let audioModeReady = false;

export async function prepareBell(): Promise<void> {
  if (audioModeReady) return;
  audioModeReady = true;
  // 무음 스위치에서도 재생 + 다른 오디오(음악/통화) 위에 겹쳐 재생
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
  }).catch(() => {});
}

export function playBell(): void {
  prepareBell();
  player.seekTo(0);
  player.play();
}
