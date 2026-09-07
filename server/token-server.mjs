/**
 * VeloMesh 개발용 LiveKit 토큰 서버.
 *
 * 실행: npm run token-server
 * 필요 env (.env): LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL
 *
 * GET /token?room=<룸이름>&identity=<라이더이름>
 *  → { "token": "...", "url": "wss://..." }
 *
 * PoC 전용이다. 프로덕션에서는 인증을 붙여 Supabase Edge Function 등으로 옮긴다.
 */
import http from 'node:http';
import { AccessToken } from 'livekit-server-sdk';
import 'dotenv/config';

const PORT = Number(process.env.TOKEN_SERVER_PORT ?? 8787);
const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } = process.env;

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
  console.error('LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL을 .env에 설정하세요.');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (url.pathname !== '/token') {
    res.writeHead(404).end('not found');
    return;
  }

  const room = url.searchParams.get('room');
  const identity = url.searchParams.get('identity');
  if (!room || !identity) {
    res.writeHead(400).end('room and identity are required');
    return;
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    ttl: '6h',
  });
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });

  const token = await at.toJwt();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ token, url: LIVEKIT_URL }));
  console.log(`[token] room=${room} identity=${identity}`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VeloMesh token server: http://0.0.0.0:${PORT}/token`);
  console.log('휴대폰에서 접근하려면 EXPO_PUBLIC_TOKEN_ENDPOINT에 이 PC의 LAN IP를 사용하세요.');
});
