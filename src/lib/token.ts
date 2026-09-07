import { config } from './config';

export interface TokenResponse {
  token: string;
  url: string;
}

/**
 * 토큰 서버에서 LiveKit 접속 토큰을 발급받는다.
 * room = "ride:<rideCode>:pack:<packName>" 형태의 채널 이름.
 */
export async function fetchToken(room: string, identity: string): Promise<TokenResponse> {
  const endpoint = `${config.tokenEndpoint}?room=${encodeURIComponent(
    room,
  )}&identity=${encodeURIComponent(identity)}`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    throw new Error(`토큰 발급 실패 (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as TokenResponse;
  if (!data.token) throw new Error('토큰 서버 응답에 token이 없습니다.');
  return { token: data.token, url: data.url || config.livekitUrl };
}
