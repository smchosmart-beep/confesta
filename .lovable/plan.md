## 목표

발표자 화면의 "토핑 키워드 (응답)" 영역에서 현재의 **떨어지는 토핑 씬**과 청중 화면에 보이는 **응답 원그래프** 중 하나를 골라 볼 수 있게 한다. 두 화면은 동시에 표시하지 않고 토글로 전환한다.

## 변경 파일

### 1) `src/components/confesta/AnswerPie.tsx` (신규)

`AnswerPromptCard.tsx`의 PieChart 렌더링 로직을 그대로 추출한 재사용 컴포넌트.

- props: `sessionId: string`, `promptId: string | null`, `promptText?: string`
- 내부에서 `useSessionToppings`로 toppings 가져와 `kind === "answer" && promptId 일치`로 필터링
- 응답 0개일 때 "아직 도착한 응답이 없어요 🍒" 안내, 그 외엔 도넛 PieChart (기존과 동일한 PALETTE/스타일)
- 카드 외곽은 부모(발표자 패널)에 맞춰 투명 배경 + 높이 100%

### 2) `src/components/confesta/AnswerPromptCard.tsx`

위 신규 컴포넌트를 사용하도록 PieChart 부분을 `<AnswerPie>`로 교체. 청중 화면 동작은 동일 (회귀 없음).

### 3) `src/routes/presenter.tsx` — `AnswerPromptTabs`

탭(프롬프트 선택) 줄 오른쪽에 작은 뷰 전환 토글 추가:

- `view: "tub" | "chart"` 로컬 state (기본 `"tub"`)
- 토글 UI: `PresenterModeToggle`과 비슷한 pill 토글, 아이콘은 `IceCream2`(토핑) / `PieChart`(통계), 라벨 "토핑" / "통계"
- 본문 영역(`flex-1 min-h-0`)에서 view에 따라 `<ToppingTubScene>` 또는 `<AnswerPie sessionId promptId={selectedId} />` 중 하나만 렌더
- 프롬프트가 0개이면 통계 토글은 비활성화 (선택 가능한 promptId가 없음)

기존 프롬프트 칩 리스트, 활성 동기화 로직, 카운트 배지는 그대로 유지.

## 비고

- 데이터/서버 로직 변경 없음. 순수 UI 변경.
- `recharts`는 이미 사용 중이라 추가 의존성 없음.
