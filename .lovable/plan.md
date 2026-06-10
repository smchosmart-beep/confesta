
# Confesta 백엔드 구현 계획

현재 데모는 Zustand + localStorage 단일 브라우저 동작입니다. 이를 Lovable Cloud(Supabase) 위에 올려 **다중 기기 실시간 동기화**(발표자·관리자 화면)와 **개인 데이터 영속화**(청중)를 지원하는 백엔드로 전환합니다. 세션/카테고리 목업은 그대로 유지하고, 사용자 행동 데이터만 DB에 저장합니다.

---

## 1. 인증 모델

- **청중**: 로그인 없음. 첫 방문 시 브라우저 localStorage에 `deviceId` (UUID) 생성 → 모든 API 호출에 함께 전송. DB는 이 ID 기준으로 스쿱·주문·영수증을 묶음. 청중은 개인 핸드폰 단일 기기 사용을 전제.
- **발표자/스태프/관리자**: 단일 공유 PIN 4자리. 진입 시 PIN 입력 → 서버 검증 성공 시 httpOnly 쿠키(서명된 세션)로 역할 부여. 환경변수 3개(`PRESENTER_PIN`, `STAFF_PIN`, `ADMIN_PIN`)로 관리.
- 기존 `PresenterAuthGate` 컴포넌트 흐름은 유지하되 localStorage 체크 → 서버 검증으로 교체.

---

## 2. 데이터베이스 스키마 (public)

```text
audience_devices       device_id(pk), created_at, last_seen
orders                 id(pk), device_id, session_id, created_at        -- 수강신청
scoops                 id(pk), device_id, session_id, flavor, stacked_at
toppings               id(pk), session_id, device_id, text, kind,
                       prompt_id?, pinned, addressed, created_at
topping_likes          topping_id, device_id (composite pk)
topping_gates          session_id(pk), kind, prompt_id?, open
answer_prompts         id(pk), session_id, text, created_at, closed_at?
session_nonces         session_id, kind ('order'|'pickup'),
                       nonce, rotated_at  (pk: session_id+kind)
receipts               token(pk), device_id, scoop_ids[], issued_at,
                       redeemed_at?, status
slide_state            id(pk='singleton'), index, total, paused, updated_at
```

RLS:
- `audience_devices`, `orders`, `scoops`, `toppings`, `topping_likes`, `receipts`: anon SELECT/INSERT 허용하되 모든 쓰기는 **server function**을 거치도록 정책 작성 (직접 클라이언트 쓰기 차단).
- `topping_gates`, `answer_prompts`, `session_nonces`, `slide_state`: anon SELECT만(실시간 구독용), 쓰기는 service_role.
- 모든 권한 변경 server function은 PIN 쿠키 검증 후 `supabaseAdmin`으로 처리.

---

## 3. 서버 함수 (`createServerFn`) 배치

`src/lib/confesta/` 하위에 `.functions.ts` 파일들로 작성:

- `device.functions.ts` — `ensureDevice(deviceId)`, `getMyState(deviceId)` (orders/scoops/receipt 한번에 hydrate)
- `audience.functions.ts` — `toggleEnroll`, `placeOrderFromQR`, `pickupFromQR`, `generateReceipt`, `addTopping`, `toggleLikeTopping`
- `presenter.functions.ts` (PIN 미들웨어) — `rotateNonce`, `togglePinTopping`, `toggleAddressedTopping`, `setToppingGate`, `createAnswerPrompt`, `updateAnswerPrompt`, `closeAnswerPrompt`, `nextSlide`/`prevSlide`/`toggleSlidePause`
- `staff.functions.ts` (PIN 미들웨어) — `redeemReceipt(token)`
- `admin.functions.ts` (PIN 미들웨어) — `getAttendanceSummary`, `getToppingStats`
- `auth.functions.ts` — `verifyPin(role, pin)` → httpOnly 쿠키 설정, `clearPin(role)`

QR 파싱/검증, 영수증 토큰 생성 등 기존 `store.ts`의 순수 로직은 `confesta-shared.ts`로 분리해 양쪽에서 재사용.

---

## 4. 실시간 동기화 (Supabase Realtime)

청중은 본인 핸드폰 단일 기기를 가정 → **개인 데이터(scoops/orders/receipt)는 Realtime 불필요**, mutation 직후 `queryClient.invalidateQueries`로 충분.

Realtime이 필요한 화면만 `supabase-js` 채널 구독:

| 화면 | 구독 대상 | 이유 |
|---|---|---|
| Audience `토핑 추가` | `answer_prompts`, `topping_gates` (filter: session_id) | 발표자가 키워드 질문을 열면 즉시 입력창 활성화 |
| Presenter `QuestionStream` | `toppings` (filter: session_id) | 청중 질문 실시간 표시 (핵심) |
| Presenter `토핑 워드클라우드` | `toppings` (filter: session_id+prompt_id) | 키워드 응답 실시간 집계 |
| Admin 대시보드 | `scoops`, `toppings` 전체 | 출석/질문 카운트 실시간 갱신 |

청중 `My 콘`, `주문`, `영수증`은 Realtime 없이 mutation → invalidate 패턴만 사용.

---

## 5. 상태 관리 리팩터링

- 기존 `useConfestaStore` (Zustand persist)를 **두 갈래로 분할**:
  - `useDeviceStore` — `deviceId`만 localStorage 영속화 (단순).
  - 도메인 데이터(scoops/toppings/orders/...)는 **TanStack Query** + (필요한 곳만) Realtime 구독으로 교체. persist 제거.
- 컴포넌트는 `useQuery(queryKey, () => getMyState(deviceId))` + `useMutation`(serverFn 호출) 패턴. Mutation 성공 시 `queryClient.invalidateQueries`. Realtime 이벤트도 invalidate 트리거.
- 점진 적용: 한 화면(Audience `주문`)부터 마이그레이션해 패턴 확정 후 나머지 확장.

---

## 6. 구현 순서

1. **Lovable Cloud 활성화** + 마이그레이션(스키마 + RLS + grants).
2. **PIN 시크릿** 3종 등록 (`secrets--add_secret`).
3. **device + auth 서버 함수** 작성, `deviceId` 부트스트랩 훅 추가.
4. **Audience 주문/스쿱/영수증** 흐름 마이그레이션 (server fn, Realtime 없음).
5. **Presenter 토핑/슬라이드** 흐름 마이그레이션 (+ `toppings` Realtime 구독).
6. **Audience 토핑 추가** 흐름 마이그레이션 (+ `answer_prompts`/`topping_gates` Realtime 구독).
7. **Staff 영수증 교환** 흐름 마이그레이션.
8. **Admin 대시보드** 집계 server fn + Realtime 연결.
9. 기존 `confesta-state-v2` localStorage 제거, 마이그레이션 완료.
10. spec.md에 백엔드 섹션 추가.

---

## 7. 위험 요소 & 결정 필요 사항

- **PIN 공유의 보안 약함**: 행사장 외부 유출 시 누구나 발표자 권한 획득. 데모/단일 행사 용도이므로 수용 가능.
- **익명 디바이스 ID**: 브라우저 데이터 삭제 시 콘 소실. UX상 영수증 발급 직전 이메일 백업 옵션을 추후 고려.
- **마이그레이션 범위**: 위 1~10을 한 턴에 다 하면 변경이 매우 큼. **1~4 (Cloud + auth + Audience 개인 데이터)** 까지 1차로 끊고, 검증 후 나머지를 진행하는 것을 권장.

진행해도 될까요? 아니면 1차 범위를 더 좁히거나 위 결정사항을 바꾸시겠어요?
