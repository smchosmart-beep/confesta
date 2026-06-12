# 문제

`SlotQRModal.tsx`의 `handlePrint`에서 원본 SVG를 복제한 뒤 `width`/`height` 속성과 `style.width`/`style.height`를 2배로 설정하지만, 화면용 `<QRCode>` 컴포넌트가 SVG에 `style="width:100%;height:auto;max-width:320px"` 인라인 스타일을 그대로 박아두기 때문에 복제본에도 그 스타일이 따라옵니다. CSS 우선순위상 인라인 `width:100%`가 내가 새로 넣는 `width:${w}px`을 덮어써서, 인쇄 미리보기에서 QR 크기가 한 번도 커지지 않은 것입니다.

# 수정 방향

`handlePrint` 내부에서 복제한 SVG에 대해:

1. `removeAttribute("style")`로 화면용 인라인 스타일 (`width:100%`, `max-width:320px` 등)을 제거.
2. `viewBox`가 이미 있으면 그대로 두고, 없으면 원본 `width`/`height`로 `viewBox`를 세팅 (스케일 기준 보존).
3. `width`/`height` 속성을 2배 픽셀 값으로 명시 (`setAttribute`).
4. 그 위에 `style.width`/`style.height`도 2배 픽셀로 다시 한 번 강제.
5. 인쇄 HTML의 `.qr svg` CSS에서는 `width`/`height`를 지정하지 않거나 `!important`로 2배 값을 박아 다른 inherited 스타일이 영향 못 주게 함.

# 검증 방법

- 관리자 화면에서 주문 QR 모달 → 인쇄 클릭 → 새 창 인쇄 미리보기에서 QR이 페이지 폭 가까이(원본 대비 약 2배) 차는지 확인.
- 텍스트(주문 QR / 테스트 / Day 1 · 오전 · 402-B)는 기존 크기 유지.

# 변경 파일

- `src/components/confesta/SlotQRModal.tsx` — `handlePrint` 내부의 SVG 복제·치환 로직과 인쇄 HTML `<style>`의 `.qr svg` 규칙.
