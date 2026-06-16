## 문제

- 청중 화면에서 **수령(pickup) QR**을 찍으면 "삑" 소리가 나는데, **주문(order) QR**은 동일한 `CameraScanner`를 쓰는데도 소리가 나지 않음.
- 코드베이스 전체를 검색해도 명시적인 오디오 재생 로직은 없음 (`Audio`, `AudioContext`, `beep` 등 0건). 즉, 한쪽에서 들리는 "삑"은 일관되게 제어되는 사운드가 아니라 우연한 부수 효과(브라우저/디바이스 차이 또는 스캔 직후 다른 UI 피드백)로 보이며, 두 흐름의 사용자 경험이 어긋남.

## 해결 방향

두 흐름 모두에서 **스캔 성공 시 동일한 "삑" 피드백**이 나도록, 코드로 제어 가능한 짧은 비프음을 추가한다. 외부 음원/파일 없이 WebAudio API 기반 유틸 하나로 처리.

## 변경 사항

1. **`src/lib/confesta/beep.ts`** (신규)
   - `playBeep()` 유틸 추가: `AudioContext` 1회 생성 후 재사용, 약 80ms / 880Hz 사인파를 짧게 재생.
   - 실패해도 조용히 무시(권한/지원 안 되는 브라우저 대비), SSR 가드 (`typeof window`) 포함.

2. **`src/routes/audience.tsx`**
   - `handleOrderScan`에서 `placeOrder` 결과가 `ok === true`일 때 `playBeep()` 호출.
   - `handleConeScan`에서도 동일하게 `pickup` 결과가 `ok === true`일 때 `playBeep()` 호출 (이미 들리던 흐름도 같은 사운드로 통일).
   - URL `?qr=...` 자동 처리(`useEffect`) 분기에서도 성공 시 동일하게 호출.

3. **`src/components/confesta/OrderCard.tsx`**
   - 개별 주문 카드의 **수령 QR 스캔** 성공 시 `playBeep()` 호출(현재 들리는 "삑"을 코드 제어로 일원화).

## 범위 밖

- QR 스캐너 라이브러리 교체나 카메라 설정 변경 없음.
- 실패/중복 스캔 시 별도 사운드는 추가하지 않음 (요청 범위 외).
- 발표자/스태프 화면(`staff.tsx`)의 스캔음은 사용자가 문제 삼지 않았으므로 변경하지 않음.
