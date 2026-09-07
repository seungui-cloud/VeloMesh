# VeloMesh

자전거 그룹라이딩용 실시간 통신·위치·Pack 운영 앱. 기획서: `docs/VeloMesh_Service_Plan_v0.2.md` (구조·용어·로드맵의 단일 기준).

## 스택

- **Expo SDK 57 (React Native) + expo-router**, TypeScript. Expo Go 불가 — WebRTC 네이티브 모듈 때문에 dev client (`npx expo run:ios|android`) 필수.
- **LiveKit** — Pack Voice (Full Duplex 그룹통화) + data channel로 GPS 위치 브로드캐스트 (topic `loc`).
- **Supabase** — MVP v0.2부터 Club/Ride/Pack/인증 (`supabase/schema.sql`, 아직 미프로비저닝).
- CNG: `/ios` `/android`는 gitignore, `npx expo prebuild`로 재생성.

## 환경 주의

- 기본 셸 Node는 v14 (nvm) — **반드시 `export PATH="/Users/seungui/.volta/bin:$PATH"`로 Node 22 사용.**
- 개발 토큰 서버: `npm run token-server` (`server/token-server.mjs`, .env에 LIVEKIT_* 키 필요). 앱은 `EXPO_PUBLIC_TOKEN_ENDPOINT`(PC LAN IP)로 접근.

## 도메인 규칙

- 계층: Club → Ride → Pack. LiveKit 룸 이름: `velomesh:<RIDE코드>:pack-<PACK>`.
- 역할: Ride Leader / Pack Leader / Sweeper / Rider (기획서 5장 권한 참조).
- UX 원칙: Screenless First, Hands-on-Bar — 라이딩 중 조작은 큰 단일 버튼/음성 위주.
- Di2 Phone Bell(v0.4)은 서버 무관 로컬 기능: BLE 버튼 → 본체 스피커 100ms 이내.
