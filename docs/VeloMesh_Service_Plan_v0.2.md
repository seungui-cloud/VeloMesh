# VeloMesh 서비스 기획서 v0.2

## 0. 문서 목적

본 문서는 VeloMesh의 제품 방향, 핵심 사용자 경험, 기능 구조, 기술 방향 및 MVP 우선순위를 정의한다.

VeloMesh는 Garmin이나 Strava를 대체하는 기록 앱이 아니다.

**VeloMesh는 자전거 동호회와 그룹라이딩을 위한 실시간 통신·위치·Pack 운영 플랫폼이다.**

---

# 1. 서비스 개요

## 서비스명

**VeloMesh**

## 한 줄 정의

**골전도/블루투스 이어폰과 스마트폰만으로 그룹라이딩 통신과 Pack 관리를 제공하는 앱**

## 슬로건

**Stay connected. Ride together.**

## 핵심 포지셔닝

기존 서비스와의 역할을 명확하게 분리한다.

### Garmin

- 속도
- 파워
- 심박
- 케이던스
- 경로 안내
- 운동 기록

### Strava

- 운동 기록 관리
- 분석
- 소셜

### VeloMesh

- 그룹 음성 통화
- Pack 단위 운영
- 실시간 그룹 위치
- 낙오 감지
- Pack 분리 감지
- Pack 간 통신
- Di2 Phone Bell

즉:

> **Garmin = 나의 라이딩**  
> **VeloMesh = 우리의 라이딩**

---

# 2. 핵심 타깃 사용자

VeloMesh의 핵심 대상은 고가의 Sena/Cardo 인터콤을 구매하지 않은 라이더다.

대부분 이미 다음 장비 중 하나는 보유하고 있다.

- 골전도 이어폰
- 일반 Bluetooth 이어폰
- AirPods
- Galaxy Buds
- Bluetooth 헤드셋

VeloMesh는 이 장비들을 이용하여 스마트폰을 **소프트웨어 기반 자전거 인터콤**으로 만든다.

예:

```text
iPhone + 골전도 이어폰
Galaxy + 골전도 이어폰
iPhone + AirPods
Galaxy + Buds

        ↓

모두 동일한 VeloMesh Pack Voice 참여
```

Sena/Cardo 전용 장비가 없어도 사용할 수 있는 것이 핵심이다.

---

# 3. 핵심 문제

## 3.1 그룹 통신 비용

Sena/Cardo는 유용하지만 그룹 전체가 동일한 수준의 인터콤 장비를 구매하기에는 비용 부담이 크다.

VeloMesh는 기존 스마트폰과 Bluetooth 오디오 장비를 사용한다.

---

## 3.2 그룹이 여러 Pack으로 나뉨

같은 동호회 라이딩이라도 실제 도로에서는 속도와 실력에 따라 여러 Pack으로 나뉠 수 있다.

예:

```text
서울로드사이클 / Sunday Ride / 24명

├─ Pack A / 8명
├─ Pack B / 8명
└─ Pack C / 8명
```

따라서 VeloMesh는 단순한 하나의 그룹 구조가 아니라 **Club → Ride → Pack** 구조를 기본으로 한다.

---

## 3.3 앞뒤 상황 전달 어려움

선두는 후미가 신호에 걸렸는지, 낙오했는지, 펑크가 났는지 알기 어렵다.

후미도 선두에게 정차 요청이나 상황 전달을 하기 어렵다.

---

## 3.4 라이딩 중 화면 조작 위험

통화나 알림을 위해 스마트폰 화면을 조작하는 것은 위험하다.

따라서 VeloMesh는 다음 입력을 적극 활용한다.

- Di2 히든버튼
- Bluetooth 이어폰 버튼
- 음성
- 큰 단일 터치 버튼
- 향후 Apple Watch / Wear OS

---

# 4. 서비스 구조

VeloMesh의 기본 계층은 다음과 같다.

```text
Club
 └─ Ride
     ├─ Pack A
     ├─ Pack B
     └─ Pack C
```

## Club

동호회 또는 상시 그룹.

예:

```text
서울로드사이클
한강야간라이딩
분당로드클럽
```

## Ride

특정 날짜의 라이딩 세션.

예:

```text
Sunday Han River Ride
2026-09-13
24 Riders
```

## Pack

실제 함께 달리는 소그룹.

예:

```text
Pack A
Fast
8 Riders

Pack B
Normal
8 Riders

Pack C
Recovery
8 Riders
```

---

# 5. 사용자 역할

## Ride Leader

라이딩 전체 관리자.

권한:

- Ride 생성
- Pack 생성
- Pack Leader 지정
- 전체 공지
- Pack 이동
- 전체 위치 확인

## Pack Leader

각 Pack의 책임자.

권한:

- Pack Voice
- Leader Channel
- Pack 상태 확인
- Pack 공지

## Sweeper

후미 담당.

권한:

- 후미 상태 확인
- 낙오자 관리
- Leader Channel

## Rider

일반 참가자.

권한:

- Pack Voice
- 위치 공유
- Quick Event
- Di2 Phone Bell

---

# 6. Mesh Voice

## 6.1 정의

VeloMesh의 Mesh Voice는 Sena의 RF Mesh 프로토콜을 의미하지 않는다.

기술적으로는:

**인터넷 기반 저지연 그룹 음성 통화**

이다.

```text
Bluetooth 이어폰
      ↕
iPhone / Android
      ↕
LTE / 5G
      ↕
VeloMesh Voice Infrastructure
      ↕
LTE / 5G
      ↕
다른 라이더
```

VeloMesh에서 "Mesh"는 물리 RF 방식이 아니라 **라이더들이 하나의 통신망으로 연결된다는 제품 개념**이다.

---

# 7. 통화 방식

## 기본: Full Duplex

Sena처럼 별도의 PTT 버튼 없이 말하면 자동으로 상대 Pack에 전달되는 방식을 기본으로 한다.

```text
Pack A

Rider 1 ─┐
Rider 2 ─┤
Rider 3 ─┼─ Full Duplex Voice
Rider 4 ─┤
Rider 5 ─┘
```

핵심 요구사항:

- 낮은 지연시간
- 안정적인 음성
- 풍절음 억제
- 패킷 손실 대응
- LTE ↔ 5G 전환 대응
- 백그라운드 동작
- 화면 잠금 상태 지원

---

# 8. 통화 품질 목표

VeloMesh의 핵심 가치 중 하나이므로 통화 품질을 가장 중요한 기술 검증 항목으로 본다.

권장 목표:

| 항목 | 목표 |
|---|---|
| 음성 코덱 | Opus |
| 체감 지연 | 약 150~300ms |
| 순간 패킷 손실 | PLC/FEC 대응 |
| 네트워크 변화 | Adaptive Bitrate |
| 무음 구간 | DTX |
| 음성 감지 | VAD |
| Echo | AEC |
| 소음 | Noise Suppression |
| 볼륨 | AGC |

---

# 9. 자전거 환경 특화 음성 처리

일반 음성통화보다 자전거 환경은 훨씬 어렵다.

주요 문제:

- 풍절음
- 차량 소음
- 노면 소음
- 이어폰 마이크 위치
- 여러 라이더 동시 발화

따라서 VeloMesh Voice는 단순 VoIP 연결이 아니라 **라이딩 환경에 맞춘 음성 튜닝**이 중요하다.

우선 검증 속도:

```text
정지
20 km/h
30 km/h
40 km/h
45 km/h 이상
```

각 속도에서 말소리 인식 가능 여부와 풍절음을 측정한다.

---

# 10. Pack Voice

기본 음성 채널은 자신의 Pack이다.

예:

```text
Ride / 24명

Pack A Voice / 8명
Pack B Voice / 8명
Pack C Voice / 8명
```

일반 Rider는 기본적으로 자신의 Pack 음성만 듣고 말한다.

이렇게 해야 많은 인원이 참가하더라도 음성 채널이 혼잡해지지 않는다.

---

# 11. Leader Channel

각 Pack Leader 및 필요 시 Sweeper만 들어가는 별도 채널.

```text
Pack A Leader ─┐
Pack B Leader ─┼─ Leader Channel
Pack C Leader ─┘
```

사용 예:

> "B팩 펑크 한 명 있습니다."

> "C팩이 2km 뒤입니다."

> "다음 보급소에서 전체 집결합니다."

일반 Rider가 들을 필요 없는 운영 통신에 사용한다.

---

# 12. Ride All Channel

필요한 경우 Ride 전체에 공지할 수 있다.

예:

> "앞쪽 공사구간입니다."

> "다음 편의점에서 전 Pack 집결합니다."

권한 기본값:

```text
Ride Leader      O
Pack Leader      O
Sweeper           선택
Rider             X
```

전체 채널은 오사용을 막기 위해 송신 권한을 제한한다.

---

# 13. Pack 이동

실제 라이딩 중 Rider가 다른 Pack에 합류할 수 있다.

예:

```text
Rider
Pack A
  ↓
Pack B
```

초기 버전에서는 사용자가 직접 Pack을 변경한다.

향후에는 위치 데이터를 이용해:

> "현재 Pack B와 함께 주행 중입니다. Pack B로 이동할까요?"

와 같이 제안할 수 있다.

자동 Pack 변경은 사용자 확인 없이 수행하지 않는다.

---

# 14. 실시간 Pack Tracking

각 참가자는 자신의 스마트폰 GPS 위치를 VeloMesh로 전송한다.

```text
Rider GPS
   ↓
VeloMesh
   ↓
Ride / Pack Position
```

기본 표시 정보:

- Rider 위치
- Pack 위치
- Pack Leader
- Sweeper
- Pack 앞뒤 길이
- Pack 간 거리
- 연결 상태

---

# 15. 지도 UX

같은 Ride에 30~50명이 참가할 경우 모든 Rider를 항상 개별 점으로 표시하면 복잡해진다.

내 Pack은 개별 표시:

```text
● ● ● ● ● ● ● ●
Pack A
```

다른 Pack은 축약 표시:

```text
● PACK B
8 Riders
+1.4 km

● PACK C
7 Riders
+3.8 km
```

사용자가 Pack을 선택하면 세부 Rider 위치를 펼칠 수 있다.

---

# 16. Pack Intelligence

VeloMesh는 단순 위치공유를 넘어서 그룹 상태를 자동으로 판단한다.

Input:

- GPS
- 속도
- 진행 방향
- 최근 이동 궤적
- GPX 진행거리
- Pack 정보

Output:

- Pack Front
- Pack Rear
- Pack Length
- Largest Gap
- Pack Split
- Dropped Rider
- Stopped Rider
- Off Route

---

# 17. 낙오 감지

예:

```text
Main Pack
● ● ● ● ● ● ●

        400m

        ● Rider
```

조건 예:

```text
Pack과 거리 > 300m
+
30초 이상 지속
```

결과:

**Dropped Rider**

Pack Leader / Sweeper에게 알림.

---

# 18. Pack Split 감지

하나의 Pack이 실제로 두 그룹으로 찢어진 경우:

```text
Group A
● ● ● ● ●

       450m

● ● ●
Group B
```

VeloMesh:

> "Pack A가 두 그룹으로 분리되었습니다."

신호대기와 같은 일시적인 분리를 고려하여 일정 시간 유지 후 확정한다.

---

# 19. 정지 감지

특정 Rider가 일정 시간 거의 움직이지 않을 경우:

```text
Speed < 2 km/h
+
30초
```

→ Stopped Rider

Leader/Sweeper에게 전달.

---

# 20. GPX 기반 거리

GPS 직선거리만 사용하면 헤어핀이나 굽은 도로에서 잘못된 판단이 발생한다.

GPX가 있는 경우:

**Course Progress Distance**

를 우선 사용한다.

예:

```text
Rider A 42.8 km
Rider B 42.2 km

Gap = 600m
```

물리적 직선거리가 가까워도 코스 진행 기준으로 실제 차이를 판단한다.

---

# 21. Di2 Phone Bell

## 정의

Shimano Di2 히든버튼을 누르면 **내 스마트폰 스피커에서 큰 자전거 벨소리가 즉시 재생**된다.

상대방 앱으로 네트워크 알림을 보내는 기능이 아니다.

```text
Di2 Hidden Button
       ↓
iPhone / Android
       ↓
Phone Speaker
       ↓
🔔 큰 자전거 벨소리
```

목적:

- 앞 라이더에게 알림
- 보행자에게 존재 알림
- 추월 전 주의
- 실제 자전거 벨 대체

---

# 22. Di2 Phone Bell 특징

Bell 기능은 서버에 의존하지 않는다.

```text
Di2 → Phone → Local Audio
```

따라서:

- 인터넷이 없어도 동작
- Ride에 참여하지 않아도 동작
- 서버가 끊겨도 동작
- 최대한 즉각적으로 재생

목표:

**버튼 → 소리 재생 100ms 이하**

---

# 23. Di2 지원

초기 검증 대상:

**Shimano 12단 Di2**

사용 환경 예:

```text
Shimano Di2
    │
    ├─ Garmin Edge 830
    │
    └─ VeloMesh App
```

Garmin 사용성을 유지하면서 VeloMesh가 히든버튼 이벤트를 받을 수 있는지를 PoC로 검증한다.

iOS와 Android 모두 최종 지원 대상이다.

---

# 24. Phone Bell 출력

기본 출력:

**스마트폰 내장 스피커**

Bluetooth 이어폰이 연결되어 있어도 Bell은 주변 사람이 들을 수 있도록 본체 스피커 출력이 우선이다.

특히 다음을 실제 기기에서 검증한다.

- iPhone + 골전도 이어폰
- Galaxy + 골전도 이어폰
- iPhone + AirPods
- Galaxy + Buds

---

# 25. Quick Event

음성 통화 외에도 빠른 상황 전달 기능을 제공한다.

예:

- Danger
- Stop
- Puncture
- Mechanical
- Regroup
- SOS

Pack 또는 Leader에게 이벤트를 전달한다.

향후 Di2 Double Click / Long Press에 매핑할 수 있다.

---

# 26. Cross Platform

VeloMesh는 처음부터 다음 플랫폼을 모두 지원하는 것을 목표로 한다.

## iOS

- iPhone
- CoreBluetooth
- CoreLocation
- AVAudioSession

## Android

- Galaxy 및 일반 Android
- BLE
- Foreground Location
- Android Audio APIs

같은 Pack에 iOS와 Android가 섞여 있어도 기능 차이가 없어야 한다.

---

# 27. 앱 구조 권장안

일반 UI와 비즈니스 로직은 최대한 공통화한다.

플랫폼 종속 기능은 Native Module로 분리한다.

```text
VeloMesh App

Shared Layer
├─ Club
├─ Ride
├─ Pack
├─ Map
├─ Account
├─ Voice UI
└─ Pack Intelligence UI

Native Layer
├─ iOS
│  ├─ BLE / Di2
│  ├─ Audio Routing
│  ├─ Background Audio
│  └─ GPS
│
└─ Android
   ├─ BLE / Di2
   ├─ Audio Routing
   ├─ Foreground Service
   └─ GPS
```

Flutter 또는 React Native 등 크로스플랫폼 프레임워크를 사용할 수 있지만, BLE·오디오·백그라운드는 네이티브 구현을 적극적으로 사용한다.

---

# 28. 서버 구조

서버는 크게 두 영역으로 분리한다.

```text
                    VeloMesh

          ┌────────────┴────────────┐
          │                         │
     App Backend                Voice RTC
          │                         │
 Club / Ride / Pack              Group Voice
 GPS / Events                    Opus
 User / Roles                    Jitter Buffer
 Pack State                      AEC / NS / AGC
```

## App Backend

초기에는 무료 또는 저비용 Backend-as-a-Service를 활용할 수 있다.

역할:

- 로그인
- Club
- Ride
- Pack
- 위치
- 이벤트
- 권한

## Voice RTC

통화 품질은 제품의 핵심이므로 초기부터 검증된 RTC 인프라를 우선 고려한다.

초기 사용자 수에서는 무료 Tier 또는 개발용 무료 용량으로 PoC가 가능하다.

사용자가 늘어난 이후 음성 사용량에 따라 유료 인프라로 확장한다.

---

# 29. 서버 비용 전략

## 초기 개발

목표:

**월 서버 비용을 거의 0원에 가깝게 유지**

가능한 구성:

- 인증 / DB / Realtime → Free Tier
- 지도 → OS 제공 지도 또는 무료 범위
- Voice RTC → 개발/무료 Tier
- Push → 플랫폼 Push 서비스

이 단계에서는 동호회 한두 개 수준의 테스트를 목표로 한다.

## 서비스 확장

사용자가 늘어나면 가장 먼저 비용이 발생할 가능성이 높은 영역은 음성 RTC다.

위치 데이터와 일반 API는 상대적으로 비용 부담이 작다.

따라서 유료화/비용 정책도 향후에는 Voice 사용량을 중심으로 설계할 수 있다.

---

# 30. 오디오 장비 지원

VeloMesh는 특정 제조사에 종속되지 않는다.

지원 목표:

- Shokz 등 골전도
- AirPods
- Galaxy Buds
- 일반 Bluetooth Earbuds
- Bluetooth Headset
- 스마트폰 자체 마이크/스피커

Sena/Cardo 지원이 가능하더라도 핵심 타깃은 아니다.

VeloMesh의 차별화는:

> **비싼 전용 인터콤 없이도 그룹통화를 할 수 있다.**

이다.

---

# 31. UX 원칙

## Screenless First

라이딩 중 화면을 보지 않아도 핵심 기능을 사용할 수 있어야 한다.

## Hands-on-Bar

핸들에서 손을 떼지 않는다.

## Voice First

상태 전달은 가능한 음성 또는 소리로 한다.

## Automatic

낙오, Pack Split 등은 앱이 자동으로 판단한다.

## Low Friction

동호회 구성원이 앱 하나만 설치하면 참가할 수 있어야 한다.

---

# 32. MVP v0.1

## 목표

**VeloMesh Voice가 실제 라이딩 환경에서 제품성이 있는지 검증**

필수:

1. iOS 앱
2. Android 앱
3. Ride 생성
4. Pack 생성
5. Pack 참가
6. 3~5명 Full Duplex Voice
7. Bluetooth 이어폰 연결
8. 백그라운드 통화
9. 기본 GPS 위치 공유

가장 중요한 검증:

**골전도 이어폰으로 실제 주행 중 통화 품질이 충분한가?**

---

# 33. MVP v0.2

## Pack 기능

- 여러 Pack 생성
- Pack Leader
- Sweeper
- Pack Voice
- Leader Channel
- Ride All Channel
- Pack 위치 표시
- Pack 이동

---

# 34. MVP v0.3

## Pack Intelligence

- Pack Front / Rear
- Pack Length
- Largest Gap
- Dropped Rider
- Pack Split
- Stopped Rider

---

# 35. MVP v0.4

## Di2 Phone Bell

- 12단 Di2 연결
- Hidden Button 이벤트
- Phone Bell
- Bell 사운드
- Speaker Routing
- Garmin Edge 830 병행 사용 검증

---

# 36. MVP v0.5

## Route Intelligence

- GPX Import
- Course Progress
- Pack Gap
- Off Route
- Wrong Turn
- Regroup Point

---

# 37. 가장 중요한 PoC

## PoC 01 — Voice

장비:

```text
iPhone 2대
Android 2대
골전도/BT 이어폰 4개
```

테스트:

```text
4 Riders
↓
VeloMesh Pack
↓
Full Duplex
```

실제 주행 테스트:

- 20 km/h
- 30 km/h
- 40 km/h
- LTE ↔ 5G
- 터널/음영지역
- 화면 잠금
- 음악 병행

측정:

- 음질
- 풍절음
- 지연
- 끊김
- 재연결
- 배터리

---

# 38. PoC 02 — Pack Tracking

최소 4대의 스마트폰을 사용한다.

확인:

- 실시간 위치
- Pack Front
- Pack Rear
- Pack Split
- Dropped Rider
- GPS 오차

---

# 39. PoC 03 — Di2 Phone Bell

대상:

- Shimano 12단 Di2
- Garmin Edge 830
- iPhone
- Android

검증:

```text
Hidden Button
      ↓
VeloMesh
      ↓
Phone Speaker
      ↓
🔔
```

확인:

- 버튼 감지
- 반응속도
- Garmin 동시 사용
- Bluetooth 이어폰 연결 중 Speaker 출력
- 화면 잠금
- 백그라운드

---

# 40. 제품의 핵심 5가지

VeloMesh의 제품성을 결정하는 핵심 기능은 다음과 같다.

## 1. Pack Voice

골전도/일반 Bluetooth 이어폰만으로 실시간 그룹통화.

## 2. Multi-Pack

하나의 Ride 안에서 여러 Pack 운영.

## 3. Pack Intelligence

낙오, Pack Split, 정지 등을 자동 판단.

## 4. Cross-Pack Communication

Pack Leader 채널과 Ride 전체 공지.

## 5. Di2 Phone Bell

Di2 히든버튼으로 스마트폰을 전자 자전거 벨처럼 사용.

---

# 41. 최종 사용자 경험

라이더는 평소처럼 Garmin을 사용한다.

```text
Garmin
→ 속도 / 파워 / 경로 / 기록
```

골전도 또는 Bluetooth 이어폰에서는:

```text
VeloMesh
→ Pack 실시간 통화
```

VeloMesh는 백그라운드에서:

```text
GPS
→ Pack 위치
→ Pack 상태 분석
→ 낙오 / 분리 감지
```

Di2 히든버튼을 누르면:

```text
Di2
→ VeloMesh
→ 내 스마트폰 스피커
→ 🔔
```

필요한 경우 Pack Leader는:

```text
Pack Voice
    ↓
Leader Channel
    ↓
Ride All
```

로 통신 범위를 변경한다.

---

# 42. 최종 제품 정의

VeloMesh는

> **스마트폰과 골전도/블루투스 이어폰만으로 그룹라이딩용 실시간 통신, Pack 운영, 위치 추적 및 Di2 기반 라이딩 인터랙션을 제공하는 크로스플랫폼 앱**

이다.

핵심 목표는 사용자가 비싼 전용 인터콤을 구매하지 않아도

- 같은 Pack과 대화하고
- 다른 Pack의 위치를 알고
- 낙오자를 놓치지 않고
- 팩장끼리 운영 통신을 하고
- Di2 버튼으로 자전거 벨까지 사용할 수 있게 하는 것이다.

---

# 43. 개발 우선순위

VeloMesh 개발은 다음 순서로 진행한다.

```text
1. Voice PoC
   ↓
2. iOS + Android Pack Voice
   ↓
3. Ride / Pack 구조
   ↓
4. GPS Pack Tracking
   ↓
5. Pack Intelligence
   ↓
6. Di2 Phone Bell
   ↓
7. GPX / Route Intelligence
```

특히 **Voice PoC를 가장 먼저 수행**한다.

그룹통화 품질이 실제 라이딩 환경에서 충분히 확보되는 것이 VeloMesh의 가장 중요한 제품 검증 포인트다.
