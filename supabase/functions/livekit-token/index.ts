// VeloMesh LiveKit 토큰 발급 Edge Function
// GET /functions/v1/livekit-token?room=<룸>&identity=<이름>
//  → { "token": "...", "url": "wss://..." }
//
// 배포: npx supabase functions deploy livekit-token --project-ref <ref> --no-verify-jwt
// 시크릿: npx supabase secrets set LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... LIVEKIT_URL=...
import { AccessToken } from 'npm:livekit-server-sdk@2';

const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY');
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET');
const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL');

Deno.serve(async (req) => {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
    return new Response('LiveKit secrets not configured', { status: 500 });
  }

  const url = new URL(req.url);
  const room = url.searchParams.get('room');
  const identity = url.searchParams.get('identity');
  if (!room || !identity) {
    return new Response('room and identity are required', { status: 400 });
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    ttl: '6h',
  });
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });

  return new Response(JSON.stringify({ token: await at.toJwt(), url: LIVEKIT_URL }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
