문제: 주문 QR 인쇄 화면에서 세션명(h1)이 양옆에 여백 없이 화면 가장자리에 닿아 답답하게 보임.

변경 파일:
- src/components/confesta/SlotQRModal.tsx

변경 내용:
- 인쇄용 HTML의 `h1` 스타일에 좌우 여백을 추가한다.
- 기존: `margin: 4px 0 2px;`
- 변경: `padding: 0 12mm; margin: 4px 0 2px; box-sizing: border-box;`
- A4 용지(210mm) 기준 12mm 좌우 패딩으로 세션명이 가장자리에 닿지 않고 호흡 공간 확보.
- 세션명이 길 경우 줄바꿈이 자연스럽게 발생하며, QR 및 하단 Confesta 영역 레이아웃에 영향 없음.

검증:
- TypeScript 타입 체크 실행.
- 긴 세션명을 가진 슬롯에서 QR 인쇄 미리보기 확인, 양옆 여백과 페이지 분리 여부 점검.