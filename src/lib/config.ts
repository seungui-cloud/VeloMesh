/**
 * 환경 설정. EXPO_PUBLIC_* 변수는 .env에서 빌드 시점에 주입된다.
 *
 * 토큰 엔드포인트 우선순위:
 * 1. EXPO_PUBLIC_DEV_TOKEN_ENDPOINT — 로컬 개발용 명시적 오버라이드 (예: http://192.168.0.10:8787/token)
 * 2. Supabase Edge Function (기본) — Mac 없이 독립 동작
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export const config = {
  livekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL ?? '',
  tokenEndpoint:
    process.env.EXPO_PUBLIC_DEV_TOKEN_ENDPOINT ??
    (supabaseUrl ? `${supabaseUrl}/functions/v1/livekit-token` : ''),
};

export function assertConfig(): string | null {
  if (!config.tokenEndpoint) {
    return '.env에 EXPO_PUBLIC_SUPABASE_URL이 설정되지 않았습니다. README를 참고하세요.';
  }
  return null;
}
