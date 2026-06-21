## 작업
메인 홈페이지(`src/routes/index.tsx`)의 발표자 역할 카드에 표시되는 영어 라벨을 **"Presenter" → "Flav-er"**로 수정합니다.

### 세부 사항
- 파일: `src/routes/index.tsx`
- 위치: `ROLES` 배열 내 발표자 객체의 `label` 필드
- 변경: `label: "Presenter"` → `label: "Flav-er"`
- 영향: `<TruckCard>`의 `label` prop으로 전달되어 카드 상단 영어 라벨로 렌더링됨

### 검증
빌드 후 홈페이지 발표자(블루베리) 트럭 카드의 영어 라벨이 "Flav-er"로 표시되는지 확인.