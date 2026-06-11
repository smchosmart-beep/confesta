## 문제

발표자 화면(`/presenter`)의 1·2·3단계 선택은 하드코딩된 `SESSIONS`(mockData.ts)를 사용합니다. 그래서 관리자에서 `402-B` 행사명을 바꿔도 발표자 드롭다운에는 옛 mock 행사명이 그대로 노출됩니다.

## 목표

3단계 "세션 선택" 항목은 **관리자가 행사명을 입력하고 주문 QR을 발급한 슬롯**에 한해서만 나타나야 합니다. 행사명·방·세션ID 모두 관리자 슬롯(`session_slots` + 주문 nonce) 기준으로 통일합니다.

## 변경 사항

### 1. `src/lib/confesta/slots.functions.ts` — 신규 server fn 추가

`listIssuedSlots`: 인증 없이(`anon` 허용) 모든 day/period에 대해 **주문 QR이 발급되어 있고 title이 비어있지 않은** 슬롯만 반환. 발표자 화면이 day/period 콤보를 만들 때 사용.

반환 형태: `{ slots: Array<{ day, period, room, title }> }` (QR payload 등 민감 정보 미포함, 공개 가능).

### 2. `src/routes/presenter.tsx` — SESSIONS 제거, 슬롯 기반으로 재구성

- `useServerFn(listIssuedSlots)` + `useQuery`로 슬롯 목록 로드.
- 1단계 일자: `slots`에 존재하는 `day`만 옵션 노출.
- 2단계 시간대: 선택된 day에 대해 존재하는 `period`만 노출(am/pm).
- 3단계 세션: 선택 day/period에 해당하는 슬롯들을 `${room} — ${title}` 형식으로 노출. 비어 있으면 "발급된 세션 없음" 안내.
- `sessionId`는 `makeSlotKey(day, period, room)` (= `1|am|402-B`). 기존 토핑/질문/실시간 채널이 이미 이 키를 쓰고 있어 변경 불필요.
- 상단 헤더 설명/수령 QR 발급 payload(`{day, period, room}`)도 선택된 슬롯에서 도출.
- 슬롯이 0개일 때 토핑/질문 영역 대신 빈 상태 메시지.

### 3. `PresenterAuthGate` 의존 제거

기존에는 세션별 `presenterPassword`(mock)로 게이트했지만 현재 라우트는 이미 PIN(`PinAuthGate role="presenter"`)으로 전체 페이지를 보호 중이므로 추가 변경 없음. mockData의 `presenterPassword`는 더 이상 사용하지 않습니다(파일은 유지).

## 데이터 흐름

```text
관리자 화면         DB                       발표자 화면
─────────       ───────────────          ─────────────
행사명 입력 → session_slots.title  ┐
QR 발급    → session_nonces       ┴→ listIssuedSlots → 3단계 옵션
```

## 영향 범위

- `mockData.SESSIONS`는 admin의 더미 통계(주문/수령 카운트 시드)와 audience/staff 화면에서도 쓰일 수 있어 **삭제하지 않습니다.** 이번 변경은 presenter 화면 한정.
- 실시간 채널 키(`toppings:${sessionId}` 등)는 sessionId 포맷이 동일(`day|period|room`)하므로 호환됩니다.

## 검증

1. 관리자에서 `402-B` 행사명을 "테스트 행사 X"로 변경.
2. 발표자 화면 새로고침 → 3단계에 "402-B — 테스트 행사 X" 노출 확인.
3. 행사명을 비우거나 주문 QR 미발급 슬롯은 드롭다운에 나타나지 않음.
4. 현재 DB 상태(`402-A`, `402-B`, `LEWEST Hall A` 세 슬롯만 발급됨) → Day 1 오전 옵션 3개만 노출되어야 함.
