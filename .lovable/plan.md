## 발표자 화면 레이아웃 재배치

`src/routes/presenter.tsx`의 `UnlockedSlotView` 한 곳만 수정.

### 현재 구조
```
[ 잠금 해제됨 · 세션명 ............... 수령QR  잠그기 ]   ← 전폭
[ 토핑키워드(응답)           | 질문 목록 ]
  · ToppingGateControl     |
  · 설명문                  |
  · AnswerPromptTabs+Scene |
```

### 변경 후 구조
```
[ 잠금해제됨·세션명·QR·잠그기 ] [ 청중 토핑 입력 제어 ]   ← 2분할
[ 토핑키워드(응답)              | 질문 목록 ]
  · 설명문                      |
  · AnswerPromptTabs           |
  · ToppingTubScene (확장)     |
```

### 변경 사항

1. **상단 행을 2열 그리드로 변경**
   - 기존 단일 카드(`mb-3 flex items-center justify-between …`)를 `grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3`로 감싼다.
   - 좌측: 기존 세션 정보 카드(수령 QR / 잠그기 버튼 포함) 그대로. 내부 `min-w-0`, 제목 `truncate` 유지.
   - 우측: 신규 카드 컨테이너(`bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream`) 안에 `<ToppingGateControl sessionId={sessionId} />`만 배치.

2. **본문 좌측 컬럼 정리**
   - `ToppingGateControl` 호출 제거(상단으로 이동).
   - 헤더 "토핑 키워드 (응답)"와 설명문("청중이 보낸 …")은 그대로 유지.
   - `AnswerPromptTabs`가 차지하는 영역이 `flex-1`로 확장되어 빈 공간(이미지의 아래쪽 빈 캔버스 영역)을 토핑 떨어지는 화면이 채우도록 한다.
   - `AnswerPromptTabs` 내부의 `<div className="flex-1 min-h-0">`는 이미 존재 → 부모에 `flex flex-col h-full`이 유지되는지 확인.

3. **반응형**
   - `lg` 미만에서는 상단 2개 카드가 세로로 쌓이도록 `grid-cols-1 lg:grid-cols-2`.
   - 본문 그리드는 기존 `xl:grid-cols-2` 유지.

### 영향 범위
- 기능/데이터/서버 호출 변화 없음. 순수 레이아웃 이동.
- `ToppingGateControl` 컴포넌트 자체는 수정 없음(동일 sessionId prop).
- audience / staff / admin 화면 영향 없음.

### 파일
- `src/routes/presenter.tsx` (UnlockedSlotView 함수만)
