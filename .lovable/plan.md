## 문제

주문 카드의 큰 검은 제목이 슬롯 키의 `room`(예: "LEWEST Hall A", "402-A")으로 표시되는데, 사용자는 관리자가 `session_slots.title` 컬럼에 입력한 **세션명**(발표 주제)이 보이길 원함.

`OrderCard.tsx`의 `resolveSessionDisplay`는 슬롯 정보를 `parseSlotKey(sessionId)`로 추출하지만 키에는 `day/period/room`만 들어있어서 title을 알 수 없음. 그래서 fallback으로 room을 제목 자리에 넣었던 것.

## 수정 방향

서버에서 주문 데이터를 내려줄 때 슬롯 title을 함께 붙여 보냄. 클라이언트가 별도 조회 없이 바로 사용.

### 1) `src/lib/confesta/audience.functions.ts`
- `AudienceOrderDTO`에 `sessionTitle: string | null` 필드 추가
- `loadState()`에서 orders 조회 후, 등장하는 `session_id`들을 `(day, period, room)`으로 파싱하여 `session_slots`를 한 번에 조회 (`in()` 또는 (day,period,room) 조합 OR). 결과를 맵으로 만들어 각 order에 title을 매핑
- 슬롯이 없거나 title이 빈 문자열이면 `null`

### 2) `src/hooks/use-audience.ts`
- DTO → 도메인 매핑에 `sessionTitle` 통과
- 기존 `Order` 타입(`src/lib/confesta/types.ts`)에 `sessionTitle?: string | null` 추가

### 3) `src/components/confesta/OrderCard.tsx`
- `resolveSessionDisplay`가 `order.sessionTitle`을 우선 사용. 없으면 기존처럼 `room`을 폴백
- 슬롯 케이스에서 `sub`(작은 글씨)는 그대로 `Day X · 오전/오후 · room` 유지 → 장소/시간 정보는 부제목에 남김
- 함수 시그니처에 두 번째 인자(title) 추가 또는 호출부에서 order 전체 전달

### 4) (선택, 일관성) 영수증 화면
- `ReceiptCard.tsx`에서 스쿱별 세션명을 표시한다면 동일하게 처리 — 일단 이번 변경 범위에서는 보류하고, 주문 카드만 수정 (사용자가 명시한 부분)

## 검증
- 관리자에서 슬롯에 "AI 융합 수학 수업 사례" 같은 title 입력 → 주문 카드 제목이 해당 텍스트로 보이고, 그 아래 부제목에 `Day 1 · 오전 · 402-A`가 그대로 표시
- title이 비어 있는 슬롯(레거시) → 기존처럼 room이 제목 자리에 표시되어 깨지지 않음
- 영수증 탭 진입 시 콘솔 에러 없음

## 변경 파일 요약
- `src/lib/confesta/audience.functions.ts` — DTO 확장 + slots 조인
- `src/lib/confesta/types.ts` — `Order.sessionTitle` 추가
- `src/hooks/use-audience.ts` — 매핑 전파
- `src/components/confesta/OrderCard.tsx` — title 우선 표시
