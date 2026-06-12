# 질문 목록 카드 내부 스크롤 (모바일/태블릿 레이아웃)

## 원인
`src/routes/presenter.tsx`의 xl 이상 레이아웃은 `ResizablePanelGroup`이 `h-[calc(100vh-220px)]`로 높이를 고정해서 `flex-1 min-h-0 + overflow-y-auto`가 정상 동작 → 내부 스크롤이 생김.

`xl:hidden` 모바일/태블릿 레이아웃은 단순 `flex flex-col gap-4`로 높이 제약이 없음. 그래서 질문 목록 카드의 `flex-1`이 무한히 늘어나 페이지 전체가 길어지고 카드 내부 스크롤이 안 생김.

## 변경
`src/routes/presenter.tsx`의 질문 목록 카드(479행 부근) 클래스에 모바일에서만 적용되는 높이 상한 추가:

```tsx
<div className="bg-card/60 ... rounded-2xl p-3 shadow-cream flex-1 min-h-0 max-h-[70vh] xl:max-h-none flex flex-col gap-2 overflow-hidden">
```

이렇게 하면:
- xl 이상: 기존 동작 그대로 (ResizablePanel 높이에 맞춰 `flex-1`).
- xl 미만: `max-h-[70vh]`가 카드 높이를 캡 → 내부 `overflow-y-auto` div가 스크롤됨.

토핑 키워드 카드(459행)도 동일한 증상이 있을 수 있으므로 같은 방식(`max-h-[70vh] xl:max-h-none`) 추가.

## 영향 범위
- 발표자 화면 모바일/태블릿 레이아웃만 영향. xl 이상은 변화 없음.
- 데이터·서버 로직 변경 없음.
