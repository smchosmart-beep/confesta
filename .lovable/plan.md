## 세션 정보 카드 높이 고정

`src/routes/presenter.tsx` UnlockedSlotView의 상단 2분할 그리드만 수정.

### 문제
현재 `grid grid-cols-1 lg:grid-cols-2 gap-3`에서 그리드 셀은 기본적으로 `stretch`되어, 우측 청중 토핑 입력 제어 카드(질문이 늘어나면 세로로 길어짐)에 맞춰 좌측 세션 정보 카드도 늘어남.

### 변경
좌측 세션 정보 카드 래퍼에 `self-start` 추가 → 콘텐츠 높이만 차지하고 우측 카드 높이에 영향 받지 않음. 우측 카드는 그대로 자연스럽게 늘어남.

```diff
- <div className="flex items-center justify-between gap-3 bg-card/60 …">
+ <div className="self-start flex items-center justify-between gap-3 bg-card/60 …">
```

기타 변경 없음. 기능/데이터 영향 없음.

### 파일
- `src/routes/presenter.tsx`
