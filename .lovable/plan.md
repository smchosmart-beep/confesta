## 목표
청중이 잘못된 QR을 스캔해 주문이 잘못 들어간 경우, 해당 주문 카드를 삭제하고 슬롯을 비워서 다른 QR을 다시 스캔할 수 있게 합니다.

## 동작 규칙
- 삭제 가능: **수령 전(picked_up_at 없음)** 주문만 삭제 허용
- 수령 완료된 주문은 스쿱이 이미 콘에 적립되어 있으므로 삭제 버튼을 노출하지 않음 (기존 "콘 초기화"로 처리)
- 삭제 시 확인 다이얼로그 한 번 띄움 ("이 주문을 삭제할까요?")
- 삭제 후 슬롯이 비므로 (3개 미만이면) "주문 QR 스캔" 버튼이 다시 노출되어 새 QR 스캔 가능

## 변경 사항

### 1. `src/lib/confesta/audience.functions.ts`
- `deleteOrder` 서버 함수 신규 추가
  - 입력: `{ deviceId, orderId }`
  - 본인 deviceId의 주문만, `picked_up_at IS NULL` 조건으로만 삭제
  - 삭제 후 `loadState(deviceId)` 반환

### 2. `src/hooks/use-audience.ts`
- `deleteOrder` mutation 추가하여 `useAudience()`에서 노출

### 3. `src/components/confesta/OrderCard.tsx`
- 수령 전(`!picked`)일 때만 카드 우상단 또는 하단에 작은 삭제 버튼(쓰레기통 아이콘) 추가
- 클릭 시 `confirm()`으로 한 번 확인 → `deleteOrder({ orderId })` 호출
- 실패 시 기존 feedback 영역에 메시지 표시

## 비변경
- 수령 완료 주문, 스쿱, 영수증 로직은 그대로
- 주문 최대 3개 제한도 그대로 (삭제로 슬롯이 비면 자연히 다시 스캔 가능)
