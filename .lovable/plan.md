# 질문 스포트라이트 모달에 토핑이 뚫고 보이는 문제 수정

## 원인
- `ToppingTubScene`의 키워드 핀들은 인라인 `style={{ zIndex: 100 - i }}`로 렌더링되어 최대 z-index 100을 가짐.
- `QuestionSpotlightModal`은 `fixed inset-0 z-50` 이라 토핑(z 1~100)이 모달 배경/카드 위로 올라옴.
- 이전 수정에서 모달 내부의 `ToppingScatter` 장식만 제거했기 때문에, 뒤 화면의 실제 토핑이 그대로 비치는 현상은 그대로 남음.

## 수정
**`src/components/confesta/QuestionSpotlightModal.tsx`**
- 루트 오버레이 `div`의 `z-50` → `z-[200]`
- 좌/우 화살표 버튼과 닫기(X) 버튼의 내부 `z-10` → `z-[210]` (모달 내부에서 카드 위에 유지)
- 카드 자체에는 별도 z-index 불필요 (오버레이 안에서 정상 스택)

이 한 파일만 수정하면 모달 뒤의 토핑 핀이 더 이상 위로 올라오지 않음. 토핑 컴포넌트와 발표자 라우트는 건드리지 않음.
