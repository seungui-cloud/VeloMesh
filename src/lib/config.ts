/**
 * 환경 설정.
 * EXPO_PUBLIC_* 변수는 .env 파일에서 읽힌다 (Expo가 자동 로드).
 *
 * - EXPO_PUBLIC_LIVEKIT_URL: LiveKit 서버 WebSocket URL (wss://...livekit.cloud 또는 자체 호스팅)
 * - EXPO_PUBLIC_TOKEN_ENDPOINT: 토큰 발급 서버 URL (개발 시 `npm run token-server` → http://<PC LAN IP>:8787)
 */
export const config = {
  livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL ?? '',
  tokenEndpoint: process.env.EXPO_PUBLIC_TOKEN_ENDPOINT ?? '',
};

export function assertConfig(): string | null {
  if (!config.tokenEndpoint) {
    return '.env에 EXPO_PUBLIC_TOKEN_ENDPOINT가 설정되지 않았습니다. README를 참고하세요.';
  }
  return null;
}
