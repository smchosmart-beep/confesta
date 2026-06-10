# 남은 백엔드 구현 계획

현재 백엔드화 완료: PIN 인증, 슬롯/주문 QR 발급, 관객 주문·스쿱·영수증 발급.
나머지 클라이언트 전용(zustand) 상태를 Supabase로 이관한다. 테이블은 대부분 이미 존재(`toppings`, `topping_likes`, `topping_gates`, `answer_prompts`, `slide_state`, `receipts`)하지만 쓰기용 serverFn이 없다.

## 작업 범위

### 1. 토핑(질문·답변) serverFn
파일: `src/lib/confesta/toppings.functions.ts` (신규)

- `listToppings({ sessionId })` — `toppings` + 내 `topping_likes` 조회해 `likedByMe` 포함 DTO 반환.
- `addTopping({ deviceId, sessionId, text, kind, promptId? })` — 게이트(`topping_gates.questions_open/answers_open`) 검사 후 insert. answer면 prompt 유효성 검사.
- `toggleLikeTopping({ deviceId, toppingId })` — `topping_likes` upsert/delete + `toppings.likes` 카운터 동기화(트랜잭션 대신 두 step + 재계산).
- `togglePinTopping({ toppingId })` / `toggleAddressedTopping({ toppingId })` — presenter PIN 필요.

### 2. 답변 프롬프트 serverFn
파일: `src/lib/confesta/prompts.functions.ts` (신규) — 모두 presenter PIN 필수.

- `createAnswerPrompt({ sessionId, text })` — 기존 open prompt를 `closed_at=now()`로 닫고 새 prompt insert, `topping_gates.answers_open=true` upsert.
- `updateAnswerPrompt({ promptId, text })`
- `closeAnswerPrompt({ promptId })` / `reopenAnswerPrompt({ promptId })`
- `deleteAnswerPrompt({ promptId })` — 연관 `toppings.prompt_id` 같이 정리.

### 3. 토핑 게이트 serverFn
파일: `src/lib/confesta/gates.functions.ts` (신규)

- `getToppingGate({ sessionId })` (public)
- `setToppingGate({ sessionId, questionsOpen?, answersOpen? })` — presenter PIN.

### 4. 슬라이드 상태 serverFn
파일: `src/lib/confesta/slides.functions.ts` (신규)

- `getSlideState()` (public, singleton row).
- `setSlide({ slideIndex?, slideTotal?, paused? })` — presenter PIN. `next/prev/togglePause/reset`는 UI에서 현재값 ± 변경 후 호출.

### 5. 수령(Pickup) QR 발급
`src/lib/confesta/slots.functions.ts`에 추가 — `session_nonces.kind='pickup'`을 같은 패턴으로 운용.

- `issuePickupQR({ day, period, room })` / `rotatePickupQR(...)` — presenter PIN.
- `audience.functions.ts`의 `pickupFromQR`는 이미 `parsed.kind==='pickup'`을 받으므로 nonce 검증 로직만 `kind='pickup'`으로 보강(현재는 누락 — 검증 추가).

### 6. 영수증 사용(Staff Redeem)
`src/lib/confesta/staff.functions.ts` (신규) — staff PIN 필수.

- `redeemReceipt({ token })` — `receipts`에서 token 조회. 없으면 `invalid`, `status='redeemed'`면 `duplicate`, 아니면 `status='redeemed'`, `redeemed_at=now()`로 update 후 `success`.
- `listRecentRedemptions({ limit })` — 최근 사용 로그(필요 시 별도 `receipt_redemptions` 테이블 없이 `receipts.status/redeemed_at` 기반).

### 7. DB 마이그레이션
한 번의 마이그레이션으로 처리:

- 누락된 쓰기 정책 대신 모든 쓰기는 serverFn(service role)으로 수행 → 정책 추가 없음, 기존 public read 정책 유지.
- `toppings`에 unique index `(session_id, prompt_id, device_id)`는 추가하지 않음(중복 답변 허용).
- `topping_likes` PK가 없으면 `(topping_id, device_id)` 복합 PK 추가, `(device_id)` 인덱스.
- `receipts.token`에 unique 제약(없으면 추가) — redeem 조회 안정성 확보.
- `session_nonces`에 `(session_id, kind)` unique 제약(없으면 추가) — `kind='pickup'` 운용 위해 필요.
- `slide_state` 싱글톤 행 보장 트리거 대신 serverFn에서 `id='singleton'` upsert.

### 8. 클라이언트 연결
- `store.ts`의 토핑/답변/게이트/슬라이드/수령 관련 메서드는 점진 제거(또는 얇은 wrapper로 유지). 우선 각 페이지의 호출부를 serverFn + `useQuery`/`useMutation`으로 교체:
  - `audience.tsx` → 토핑 읽기/추가/좋아요, 답변 프롬프트 읽기, 슬라이드 동기화.
  - `presenter.tsx` → 게이트 토글, 답변 프롬프트 CRUD, 슬라이드 컨트롤, 토핑 핀/처리, pickup QR 발급/회전.
  - `staff.tsx` → 영수증 사용.
- 실시간 동기화는 Supabase realtime 채널(`toppings`, `answer_prompts`, `topping_gates`, `slide_state`)을 구독해 `queryClient.invalidateQueries` 호출.

### 9. 검증
- 관객 페이지에서 질문 작성 → presenter 화면에 등장, 좋아요 누적.
- presenter가 답변 프롬프트 열기/닫기 → 관객 입력창 토글.
- 슬라이드 next/prev/pause → 다른 탭 관객 화면 즉시 반영.
- 발급된 pickup QR로 관객이 수령 → `orders.picked_up_at` 갱신, 스쿱 적립.
- 영수증 발급 후 staff 스캐너에서 사용 → 두 번째 시도 시 `duplicate`.

## 변경/생성 파일 요약
- 신규: `toppings.functions.ts`, `prompts.functions.ts`, `gates.functions.ts`, `slides.functions.ts`, `staff.functions.ts`, 마이그레이션 1개.
- 편집: `slots.functions.ts`(pickup QR), `audience.functions.ts`(pickup nonce 검증), `routes/audience.tsx`, `routes/presenter.tsx`, `routes/staff.tsx`, `store.ts`(이관된 메서드 제거/축소).

## 메모
- 모든 mutate serverFn은 `assertAdmin`/`assertPresenter`/`assertStaff` 헬퍼(쿠키 기반 PIN 검증)로 보호. 공용 헬퍼는 `slots.functions.ts`의 `assertAdmin` 패턴을 `auth.functions.ts` 또는 `pin.server.ts` 옆에 `assertRole(role)`로 추출.
- `device_id`는 기존 관객 흐름과 동일하게 zustand persist의 UUID 사용.
