영수증 탭의 "이미지로 저장" 버튼 아래에 "데모 초기화" 버튼을 다시 추가합니다.

## 변경 파일
- `src/components/confesta/ReceiptCard.tsx`

## 구현 내용
1. `ready` 상태(영수증 발급 완료) UI에서 "이미지로 저장" 버튼 아래에 "데모 초기화" 버튼을 추가합니다.
2. 버튼 클릭 시 `useAudience`의 `reset()`을 호출해 스쿱, 토핑, 영수증 데이터를 초기화합니다.
3. 버튼 스타일은 기존 저장 버튼과 대비되도록 muted/ghost 톤으로 배치합니다.

## 영향 검토
- `reset`은 `useAudience`가 제공하는 기존 server function(`resetMyCone`)을 사용합니다. 새로운 서버 로직은 추가되지 않습니다.
- 초기화 후에는 `ready` 조건(`scoops.length >= MIN_SCOOPS_FOR_RECEIPT`)이 false가 되어 다시 샘플 영수증 미리보기 화면으로 돌아갑니다.
- audience-state 쿼리는 `applyResult` 훅에 의해 자동 무효화/갱신됩니다.