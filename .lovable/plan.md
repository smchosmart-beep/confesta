# 발표자 화면에 "주문 QR" 버튼 추가

수령 QR 왼쪽에 **주문 QR** 버튼을 새로 두고, 클릭하면 관리자 화면에서 발급한 그 세션의 주문 QR을 모달로 보여줍니다. 주문 QR은 갱신되지 않는 고정 QR이라 수령 QR과 달리 회전 타이머가 없습니다.

## 동작

- 버튼 위치: `UnlockedSlotView` 헤더 카드에서 `수령 QR` 버튼 **왼쪽**, 동일한 사각형 스타일(아이콘 + "주문 QR" 라벨), 색은 구분을 위해 `bg-grad-blueberry` 계열.
- 클릭 시: 신규 모달 오픈 → 해당 세션의 주문 QR(payload) 표시. 관리자가 아직 발급하지 않았다면 "관리자에게 주문 QR 발급을 요청해주세요" 안내.
- 모달에는 `SlotQRModal`을 재사용해 인쇄 버튼도 그대로 지원(재발급 버튼은 제외 — 발표자는 회전 권한 없음).

## 서버

- `src/lib/confesta/slots.functions.ts`에 신규 serverFn 추가
  - 이름: `getOrderQRForPresenter`
  - 입력: `{ day, period, room }`
  - 권한: `assertPresenterSlot(makeSlotKey(...))` (기존 `issuePickupQR`와 동일한 발표자 쿠키 검증)
  - 동작: `session_nonces`에서 `kind='order'`인 행을 조회만 함(생성/회전 X). 있으면 `{ payload: makeOrderQR(key, nonce) }`, 없으면 `{ payload: null }`.

## 클라이언트

- `src/routes/presenter.tsx`
  - `getOrderQRForPresenter`, `SlotQRModal` import 추가
  - `UnlockedSlotView`에 상태: `orderOpen`, `orderPayload`
  - 모달 열 때 serverFn 1회 호출(useMutation) → 응답으로 payload 세팅
  - 수령 QR 버튼 옆에 "주문 QR" 버튼 렌더
  - `SlotQRModal`로 표시 (title=`slot.title`, subtitle=`Day {n} · {period 한글} · {room}`)

## 변경 파일

- `src/lib/confesta/slots.functions.ts` — `getOrderQRForPresenter` serverFn 추가
- `src/routes/presenter.tsx` — 버튼/상태/모달 추가
