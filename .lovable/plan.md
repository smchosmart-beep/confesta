## 문제

청중이 인쇄된 주문 QR을 폰 기본 카메라 앱으로 스캔하면 OS가 "사용 가능한 앱 데이터가 없습니다."를 표시합니다. QR 페이로드가 `confesta:order:...`라는 비표준 URL 스킴이라 OS가 처리할 앱을 못 찾기 때문입니다.

## 해결 방향

주문 QR을 **https 링크 형태로 인코딩**하되, 기존 `confesta:` 페이로드 검증 로직은 그대로 유지합니다. 청중 페이지가 URL의 `?qr=...` 파라미터를 읽어 자동으로 주문 처리를 트리거합니다.

## 변경 사항

### 1. QR 페이로드 형식 (`src/lib/confesta/shared.ts`)
- `makeOrderQR(slotKey, nonce)` → `https://confesta.lovable.app/audience?qr=confesta:order:{slotKey}:{nonce}` 반환
- `makePickupQR`도 동일하게 변경 (일관성)
- `parseSessionQR(payload)`: 입력이 https URL이면 `qr` 쿼리 파라미터를 추출한 뒤 기존 `confesta:...` 파싱 로직 재사용 → 카메라에서 스캔한 원본 URL과 앱 내 스캐너에서 읽은 페이로드 모두 호환
- 베이스 URL은 `VITE_PUBLIC_SITE_URL` env (없으면 `https://confesta.lovable.app` 기본값)로 처리

### 2. 청중 라우트 자동 처리 (`src/routes/audience.tsx`)
- `useSearch` 또는 `window.location.search`로 `qr` 파라미터 읽기
- 값이 있으면:
  - `kind === "order"` → 자동으로 `placeOrder(payload)` 호출 + "주문" 탭으로 이동
  - `kind === "pickup"` → 자동으로 `pickup(payload)` 호출 + "My 콘" 탭으로 이동
  - 결과를 기존 feedback 영역에 표시
- 처리 후 `navigate({ to: "/audience", replace: true })`로 쿼리 제거 (새로고침 시 중복 실행 방지)
- deviceId 준비 전이면 대기 후 처리

### 3. 기존 인쇄물 안내
`SlotQRModal` 푸터에 "기본 카메라 앱으로 스캔 가능" 한 줄 추가 (선택).

## 영향 없음

- 검증 로직(`session_nonces`, `assertPresenter*`)은 변경 없음
- 발표자/관리자가 이미 발급한 QR은 자동으로 새 형식으로 재렌더링됨 (DB에는 nonce만 저장하고 페이로드는 `make*QR`로 매번 생성하므로)
- 인쇄된 기존 QR이 있다면 재인쇄 필요

## 기술 메모

- TanStack Router `validateSearch`로 `qr?: string` 타입 정의
- 자동 처리 useEffect는 `deviceId && qrParam && !processedRef.current` 가드로 1회만 실행
