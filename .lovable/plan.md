## 목표
관리자 화면의 각 호실(서브 그리드 셀)에 "초기화" 버튼을 추가하여, 해당 슬롯(day|period|room)의 모든 토핑·주문·수령 데이터를 한 번에 비울 수 있게 합니다.

## 초기화 범위 (해당 `session_id`에 한해)
- `orders` 행 전체 삭제 (주문 + picked_up_at 수령기록)
- `scoops` 행 전체 삭제 (청중 콘에서 적립된 스쿱)
- `toppings` 행 전체 삭제 (질문/토핑) — `topping_likes`는 FK 또는 명시 삭제로 함께 제거
- `topping_likes` 명시 삭제 (session_id 기준)
- `answer_prompts` 삭제 (해당 슬롯의 답변형 질문 프롬프트)
- `topping_gates` 삭제 (필터/잠금 설정)
- `slide_state`는 보존 (발표자가 보고 있는 슬라이드 상태는 운영 설정에 가까움)
- `session_slots`(QR/비밀번호/제목)와 `session_secrets`/`session_nonces`는 보존

수령 영수증(`receipts`)은 device_id 단위라 슬롯과 직접 묶이지 않으므로 건드리지 않습니다. (해당 슬롯 스쿱이 사라지면 기존 영수증은 무해한 과거 기록으로 남음.)

## UX
- 위치: 각 서브 셀(VenueCard 내 sub.code 셀, MobileVenueCard 동일) 우상단의 QR 컨트롤 옆에 작은 휴지통/리셋 아이콘 버튼
- 클릭 시 `window.confirm("○○○호의 주문/수령/토핑을 모두 초기화할까요? 되돌릴 수 없습니다.")`로 한 번 확인
- 성공 시 토스트 + 집계 쿼리(`admin-slots`, `slot-aggregates`) 무효화 → 카운트 즉시 0으로 갱신
- 진행 중 버튼 비활성화

## 변경 사항

### 1. `src/lib/confesta/admin.functions.ts`
- `resetSlotData` 서버 함수 신규 추가
  - 입력: `{ day, period, room }` → `sessionId = makeSlotKey(...)`
  - `assertRole("admin")` 후 위 6개 테이블에서 `session_id = sessionId`로 삭제 (Promise.all)
  - 반환: `{ ok: true, deleted: { orders, scoops, toppings, ... } }`

### 2. `src/routes/admin.tsx`
- 새 컴포넌트 `SlotResetButton` 추가 (VenueCard 및 MobileVenueCard 양쪽에서 재사용)
  - props: `day`, `period`, `room`, `label`
  - `useServerFn(resetSlotData)` + `useMutation` 사용
  - 성공 시 `admin-slots`, `slot-aggregates` 쿼리 invalidate
- VenueCard 서브 셀 헤더 줄(696행 부근, SlotQRControls 옆)에 버튼 배치
- MobileVenueCard에도 동일하게 추가

## 비변경
- QR/비밀번호/세션 제목, slide_state, receipts는 그대로
- 발표자/청중 화면 로직 무변경 (다음 새로고침/실시간 invalidation으로 빈 상태 반영)
