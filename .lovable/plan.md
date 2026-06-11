## 작업
`src/routes/presenter.tsx`의 좌/우 2열 그리드를 드래그 가능한 리사이저블 패널로 교체. 가운데 핸들을 잡고 좌우로 끌어 비율 조정 가능.

## 변경
- 기존 `grid grid-cols-1 xl:grid-cols-2 gap-4` 컨테이너를 `xl` 이상에서 `ResizablePanelGroup direction="horizontal"`로 감쌈
- 모바일/태블릿(`<xl`)에서는 기존처럼 세로 스택 유지 (`hidden xl:flex` / `xl:hidden` 분기)
- `src/components/ui/resizable.tsx`의 `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` 사용 (이미 프로젝트에 존재, shadcn + react-resizable-panels)
- 기본 비율: 좌 50 / 우 50, 각각 최소 30%
- 핸들에 `withHandle` 옵션을 켜서 시각적 그립 표시

## 코드 구조 (개요)
```tsx
<div className="hidden xl:block">
  <ResizablePanelGroup direction="horizontal" className="gap-0">
    <ResizablePanel defaultSize={50} minSize={30}>
      <div className="flex flex-col gap-3 pr-2">{/* 좌측: 잠금카드 + 토핑카드 */}</div>
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={50} minSize={30}>
      <div className="flex flex-col gap-3 pl-2">{/* 우측: 게이트 + 질문카드 */}</div>
    </ResizablePanel>
  </ResizablePanelGroup>
</div>
<div className="xl:hidden flex flex-col gap-4">
  {/* 동일한 좌/우 콘텐츠 세로 스택 */}
</div>
```

코드 중복을 피하기 위해 좌/우 컬럼 콘텐츠를 같은 파일 내 지역 변수(JSX)로 추출 후 두 레이아웃 분기에서 재사용.

## 영향 범위
- `src/routes/presenter.tsx`만 수정. 카드 내부 콘텐츠/로직/스타일 변경 없음.
- 의존성 추가 없음 (이미 설치됨).
