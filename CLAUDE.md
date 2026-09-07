# VeloMesh

자전거 그룹라이딩용 실시간 통신·위치·Pack 운영 앱. 기획서: `docs/VeloMesh_Service_Plan_v0.2.md` (구조·용어·로드맵의 단일 기준).

## 스택

- **Expo SDK 57 (React Native) + expo-router**, TypeScript. Expo Go 불가 — WebRTC 네이티브 모듈 때문에 dev client (`npx expo run:ios|android`) 필수.
- **LiveKit** — Pack Voice (Full Duplex 그룹통화) + data channel로 GPS 위치 브로드캐스트 (topic `loc`).
- **Supabase** — MVP v0.2부터 Club/Ride/Pack/인증 (`supabase/schema.sql`, 아직 미프로비저닝).
- CNG: `/ios` `/android`는 gitignore, `npx expo prebuild`로 재생성.

## 개발환경 (이 Mac 전용 주의사항)

- **Node**: 기본 셸 Node는 v14 (nvm이 PATH 선점) — 모든 명령 앞에 `export PATH="/Users/seungui/.volta/bin:$PATH"` (Node 22) 또는 `/opt/homebrew/bin` (Node 26). 안 하면 `node:events` 오류.
- **Java**: Gradle 9는 JDK 17+ 필요 — `export JAVA_HOME=/Users/seungui/Library/Java/JavaVirtualMachines/corretto-17.0.9/Contents/Home` (기본 JAVA는 11이라 실패).
- **CocoaPods**: `/opt/homebrew/bin/pod` (1.17) 사용. `/usr/local/bin/pod`(1.8)는 구버전이라 실패 — PATH에서 homebrew 우선.
- **adb 유령 기기**: Docker가 5554 포트를 점유해 `emulator-5554 offline`이 항상 표시됨. 이 때문에 `expo run:android`가 실패 → **gradle 직접 실행** + `ANDROID_SERIAL` 지정으로 우회.
- **실기기**: 아이폰17 UDID `00008150-000C5969018A401C` (무선 페어링, 서명 "Apple Development: seungui park" 자동). 갤럭시 A32 `RF9R406VGAZ` (USB).
- **빌드 명령**:
  - iOS Release: `npx expo run:ios --device 00008150-000C5969018A401C --configuration Release`
  - Android Release: `cd android && ANDROID_SERIAL=RF9R406VGAZ ./gradlew :app:installRelease` (JAVA_HOME 필수)
  - 네이티브 모듈/플러그인 변경 시 먼저 `npx expo prebuild`
- **토큰 발급**: 기본은 Supabase Edge Function(`livekit-token`, 배포됨) — Mac 불필요. 로컬 개발 시에만 `npm run token-server` + `.env`의 `EXPO_PUBLIC_DEV_TOKEN_ENDPOINT`.
- **Supabase**: 프로젝트 ref `ixzpubswrniaenikgqex` (서울). CLI 로그인됨 — SQL 실행: `npx supabase db query --linked --project-ref ixzpubswrniaenikgqex --yes -f <file>`.
- **`.env`는 절대 읽지 말 것** (cat/grep 포함, 사용자 지시). 빌드가 자동 로드함.

## 도메인 규칙

- 계층: Club → Ride → Pack. LiveKit 룸 이름: `velomesh:<RIDE코드>:pack-<PACK>`.
- 역할: Ride Leader / Pack Leader / Sweeper / Rider (기획서 5장 권한 참조).
- UX 원칙: Screenless First, Hands-on-Bar — 라이딩 중 조작은 큰 단일 버튼/음성 위주.
- Di2 Phone Bell(v0.4)은 서버 무관 로컬 기능: BLE 버튼 → 본체 스피커 100ms 이내.
