## 계획: 영수증 샘플 UI 정리

### 변경 범위
`src/components/confesta/ReceiptCard.tsx` — `SampleReceipt` 컴포넌트 내부

### 작업 내용
1. 샘플 영수증에 표시되는 `<QRCode>` 요소를 삭제합니다.
2. 샘플 영수증에 표시되는 `[READY FOR REDEMPTION]` 배지를 삭제합니다.

### 변경 대상 코드
- QRCode 블록: `confesta:receipt:sample:preview` 값을 가진 `<QRCode>` 태그
- 배지 블록: `[READY FOR REDEMPTION]` 텍스트를 가진 `<span>` 태그

### 영향 범위
- 실제 영수증(`ReceiptCard` 본문)에는 영향 없음. 오직 `SampleReceipt` 서브컴포넌트만 수정.
- 데이터/서버 로직 변경 없음. 순수 UI 삭제.