## 원인 가설

발표자 페이지의 질문 목록 카드 스크롤이 미리보기에서도 안 잡히는 이유는 부모 체인의 높이 제약이 새기 때문입니다. 코드 자체는 `flex-1 min-h-0 overflow-y-auto`를 갖고 있지만 다음 두 가지가 실제 동작을 막습니다:

1. `src/routes/presenter.tsx`의 `ResizablePanelGroup`에 `orientation="horizontal"`이 들어가 있음. `react-resizable-panels`의 실제 prop은 `direction`이므로 이 값은 무시되고, 라이브러리가 방향 계산을 폴백 처리하면서 패널 높이가 명시적으로 셋팅되지 않는 경우가 생깁니다.
2. 질문 카드 컨테이너(`bg-card/60 ... flex-1 min-h-0`)에 `overflow-hidden`이 없어, 안의 콘텐츠가 길어지면 카드가 시각적으로 늘어나 보이는 현상이 발생합니다.

## 수정 내용 (모두 `src/routes/presenter.tsx` 한 파일)

### 1) ResizablePanelGroup props 교정 (473줄)

```tsx
<ResizablePanelGroup
  direction="horizontal"
  className="hidden xl:flex h-[calc(100vh-220px)] min-h-[600px]"
>
```

`orientation` → `direction`. (왼쪽/오른쪽 컬럼 모두 정상 너비를 받으면서 그룹 height도 안정적으로 적용됨)

### 2) 질문 목록 카드에 `overflow-hidden` 추가 + 스크롤 래퍼 강화 (460-466줄)

```tsx
<div className="bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
    질문 목록
  </h2>
  <div className="h-0 flex-1 overflow-y-auto">
    <QuestionStream sessionId={sessionId} />
  </div>
</div>
```

- 카드 컨테이너에 `overflow-hidden` 추가 → 카드 자체가 시각적으로 늘어나는 것을 차단.
- 스크롤 래퍼 `flex-1 min-h-0` → `h-0 flex-1`. 동일 효과지만 더 강하게 0px 베이스라인을 강제해 모든 브라우저에서 일관 동작.

### 3) (선택) 토핑 키워드 카드에도 동일 처리 (443줄)

좌측 토핑 카드도 같은 패턴을 쓰고 있으므로 `overflow-hidden` 추가 및 내부 `flex-1 min-h-0` → `h-0 flex-1` 교체. 회귀 방지 + 일관성.

### 4) `xl:hidden` (좁은 화면) 분기는 그대로

좁은 화면(`xl:hidden flex flex-col gap-4`)은 의도적으로 페이지 전체 스크롤을 쓰므로 변경하지 않음. 데스크탑(xl 이상)에서만 카드 내부 스크롤이 적용됩니다.

## 검증

수정 후 미리보기 `/presenter`에서:
- 질문이 카드 가시 영역보다 많아져도 카드 높이는 고정.
- 카드 안에서만 세로 스크롤이 동작.
- 좌우 패널 너비 핸들도 정상 동작.
