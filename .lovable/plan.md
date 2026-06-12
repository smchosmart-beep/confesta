# QR 스캔 즉시 카메라 닫기

## 문제
청중 화면에서 주문/수령 QR을 스캔해도 "이미 주문한 세션이에요" 같은 에러일 때 카메라 창이 계속 열려 있어, 사용자가 인식이 안 된 줄 알고 반복해서 비춤. 성공일 때만 닫히는 현재 동작 때문.

## 변경
`src/routes/audience.tsx`의 `handleOrderScan` / `handleConeScan`에서, QR이 올바른 형식(`parseSessionQR` 성공)이면 **결과(성공·실패) 관계없이 카메라 창을 즉시 닫고** 피드백 메시지만 카드 아래에 노출.

### handleOrderScan
1. `parseSessionQR(text)` 호출.
2. 파싱 실패 → 카메라 유지, "QR 형식이 올바르지 않아요" 표시 (스캐너가 다른 코드를 계속 인식할 수 있게).
3. 파싱 성공 → `setOrderScanOpen(false)` 먼저 호출.
   - `kind==="pickup"`이면 "수령 QR은 …" 안내.
   - `kind==="order"`이면 `placeOrder(text)` 결과의 ok/메시지를 그대로 피드백.

### handleConeScan
동일 패턴으로, 파싱 성공 시 `setConeScanOpen(false)` 후 결과 메시지 표시.

## 영향 범위
- UI/프론트엔드 로직만 수정. 서버 함수·DB·실시간 구독 변경 없음.
- CameraScanner 컴포넌트는 그대로.
- 잘못된(다른 앱의) QR을 비출 때는 카메라가 닫히지 않아 정상 QR로 다시 비출 수 있음.
