# 질문 목록 카드 내부 세로 스크롤 (PC)

## 문제
`src/routes/presenter.tsx` 514줄 부근, 우측 컬럼 `질문 목록` 카드:

```tsx
<div className="bg-card/60 ... flex-1 min-h-0 max-h-[70vh] xl:max-h-none flex flex-col gap-2 overflow-hidden">
  ...
  <div className="h-0 flex-1 overflow-y-auto">
    <QuestionStream sessionId={sessionId} />
  </div>
</div>
```

- 모바일/태블릿: `max-h-[70vh]`로 제한되어 내부 스크롤 정상 동작
- PC(xl≥1280): `xl:max-h-none`이 제한을 풀어버려, ResizablePanel 안에서 `flex-1 + min-h-0` 체인이 의도대로 동작하지 못하고 카드가 질문 개수만큼 그대로 늘어남 → 페이지 자체가 길어지고 카드 내부에는 스크롤이 안 생김

## 수정
같은 줄 좌측 컬럼의 `토핑 키워드` 카드도 동일 패턴(`max-h-[70vh] xl:max-h-none`)이지만 본 요청은 질문 목록 한정이므로 우측 카드만 손봅니다.

`presenter.tsx` 509번 라인:

- `max-h-[70vh] xl:max-h-none` → `max-h-[70vh] xl:max-h-full`
  - xl에서는 ResizablePanel이 부여하는 높이(`h-[calc(100vh-220px)]` - ToppingGateControl 높이)를 그대로 받아 카드 높이가 패널 안에 묶이고, 내부 `overflow-y-auto`가 동작
  - 비-xl에서는 기존 `max-h-[70vh]` 동작 그대로 유지

내부 스크롤 영역은 이미 `h-0 flex-1 overflow-y-auto`라 추가 변경 불필요.

## 영향 범위
- 변경 파일: `src/routes/presenter.tsx` 1줄
- 좌측 `토핑 키워드` 카드, 모바일 레이아웃, ToppingGateControl 등 다른 동작 영향 없음
- 질문이 5개 이하일 때는 카드가 콘텐츠 높이대로 줄어들고 스크롤 미노출 — 기존과 동일한 모양

## 검증
- PC 뷰포트(1406×853) `/presenter`에서 질문 7개 이상일 때 카드 내부 스크롤이 생기는지 확인
- 모바일 뷰포트에서 기존 70vh 제한이 유지되는지 확인
