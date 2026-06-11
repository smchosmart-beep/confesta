## 변경 사항

### 1. 청중(모바일) — `src/routes/audience.tsx` (line 439)
"궁금해요" 질문 목록 `<ul>`에서 높이 제한과 세로 스크롤 제거. 질문이 많아지면 카드 컨테이너가 그만큼 아래로 길어지도록 변경.

- 변경 전: `className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1"`
- 변경 후: `className="flex flex-col gap-2"`

### 2. 발표자(PC) — `src/routes/presenter.tsx` (line 458~465 영역)
현재 이미 `flex-1 min-h-0 overflow-y-auto`로 내부 스크롤 구조이긴 하나, 부모 ResizablePanelGroup이 `min-h-[720px]`라 콘텐츠에 따라 더 늘어날 수 있음. 카드 컨테이너 높이를 화면 기준으로 고정해 질문이 많아도 카드 크기는 일정하게 유지하고 내부에서만 세로 스크롤이 발생하도록 함.

- ResizablePanelGroup 클래스: `min-h-[720px]` → `h-[calc(100vh-220px)] min-h-[600px]` (xl 이상에서만 적용되므로 PC에 한정)
- 질문 목록 카드는 그대로 `flex-1 min-h-0` + 내부 `overflow-y-auto` 유지 → 결과적으로 카드 높이는 패널 높이에 고정되고, 질문이 늘어나도 내부 스크롤로 처리됨.

### 영향 범위
- 청중 뷰: 질문 많을 때 페이지 자체가 길어져 페이지 스크롤로 모든 질문 노출.
- 발표자 뷰: 좌/우 패널과 질문 카드 높이가 뷰포트에 고정되어 레이아웃이 흔들리지 않음. 모바일/태블릿(`xl:hidden`) 발표자 뷰는 기존 동작 유지.
