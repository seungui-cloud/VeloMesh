# VeloMesh

**Stay connected. Ride together.**

골전도/블루투스 이어폰과 스마트폰만으로 그룹라이딩 통신과 Pack 관리를 제공하는 크로스플랫폼 앱.

- 기획서: `VeloMesh_Service_Plan_v0.2.md` (Downloads)
- 스택: **Expo (React Native) · LiveKit (Voice RTC) · Supabase (App Backend)**

## 현재 상태 — MVP v0.1 Voice PoC

- Ride 코드 + Pack 선택으로 참가 (`velomesh:<RIDE>:pack-<PACK>` LiveKit 룸)
- 3~5명 Full Duplex Pack Voice (Opus, AEC/NS/AGC는 LiveKit 기본 제공)
- 발화 표시, 음소거 큰 버튼 (Hands-on-Bar UX)
- 기본 GPS 위치 공유: LiveKit data channel로 브로드캐스트, 라이더 간 거리·속도 표시
- iOS `UIBackgroundModes: audio/location`, Android foreground service (백그라운드 통화)

## 시작하기

### 1. LiveKit Cloud 키 발급

1. https://cloud.livekit.io 에서 프로젝트 생성 (무료 티어로 PoC 충분)
2. Settings → Keys에서 API Key/Secret 발급
3. `.env.example`을 `.env`로 복사하고 값 입력
   - `EXPO_PUBLIC_TOKEN_ENDPOINT`는 이 PC의 **LAN IP** (예: `http://192.168.0.10:8787`)

### 2. 토큰 서버 실행

```bash
npm run token-server
```

### 3. 앱 실행 (dev client 필요 — WebRTC 네이티브 모듈 때문에 Expo Go 불가)

```bash
# iOS (Xcode 필요)
npx expo run:ios --device

# Android (Android Studio 필요)
npx expo run:android --device
```

기기 2대 이상에서 같은 Ride 코드 + 같은 Pack으로 참가하면 Full Duplex 통화가 시작된다.

### PoC 01 체크리스트 (기획서 37장)

- [ ] 정지 / 20 / 30 / 40 km/h 풍절음·음질
- [ ] LTE ↔ 5G 전환
- [ ] 터널/음영지역 재연결
- [ ] 화면 잠금 + 백그라운드 통화
- [ ] 음악 병행 재생
- [ ] 배터리 소모

## 로드맵

| 버전 | 내용 | 상태 |
|---|---|---|
| v0.1 | Voice PoC + GPS 공유 | **구현됨 (실기기 검증 필요)** |
| v0.2 | Club/Ride/Pack 관리(Supabase, `supabase/schema.sql`), Leader Channel, Ride All | 스키마 준비됨 |
| v0.3 | Pack Intelligence (낙오/Split/정지 감지) | |
| v0.4 | Di2 Phone Bell (BLE 네이티브 모듈) | |
| v0.5 | GPX / Route Intelligence | |

## 구조

```text
src/app/          expo-router 화면 (index: 참가, room: Pack Voice)
src/hooks/        use-location-sharing (GPS → LiveKit data channel)
src/lib/          config, token, geo
server/           개발용 LiveKit 토큰 서버 (PoC 전용, 이후 Supabase Edge Function으로 이전)
supabase/         v0.2 스키마
```
