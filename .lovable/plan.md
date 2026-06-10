## 변경 요약

`audience.tsx`의 "토핑 추가" 섹션 하단 카드(현재 "다른 사람들의 토핑")를 위쪽 `ToppingInput`의 현재 서브탭(`질문하기` / `키워드 응답`)에 따라 다른 콘텐츠를 보여주도록 바꿉니다.

- **질문하기 탭** → 제목만 `"다른 사람들의 토핑"` → **`"궁금해요"`** 로 변경, 나머지 리스트 구조/좋아요 동작은 그대로 유지.
- **키워드 응답 탭** → 리스트(다른 사람들의 토핑) **삭제**. 대신 같은 세션의 `kind === "answer"` 토핑을 **키워드별 빈도 파이차트(원그래프)** 로 표시.

## 구현 방법

### 1) `src/components/confesta/ToppingInput.tsx`
- `kind` 상태를 **선택적 controlled prop** 으로 승격:
  - props에 `kind?: ToppingKind`, `onKindChange?: (k: ToppingKind) => void` 추가.
  - 내부 `useState`는 fallback(미제공 시)로만 사용. 부모가 넘기면 부모 값 사용.
- 자동 전환 `useEffect`도 `onKindChange` 가 있으면 그것으로 호출.
- 기존 UI/제출/sprinkle 로직 변경 없음.

### 2) `src/routes/audience.tsx`
- `AudienceView` 안에 `const [toppingKind, setToppingKind] = useState<ToppingKind>("question")` 추가.
- `<ToppingInput sessionId={activeSessionId} kind={toppingKind} onKindChange={setToppingKind} />` 로 호출.
- 하단 카드(현재 339~406행)를 조건부 렌더:
  - `toppingKind === "question"`: 기존 리스트 카드 그대로, 단 `h3` 텍스트를 **`"궁금해요"`** 로 변경. 카운트/설명/리스트/좋아요 동작 유지.
  - `toppingKind === "answer"`: 새 카드 — 제목 `"키워드 응답 현황"`, 같은 세션 + `kind === "answer"` 토핑들을 텍스트(소문자/trim) 기준으로 그룹핑해 빈도 집계 후 `recharts` `PieChart` 로 표시.

### 3) 파이차트 (recharts, 이미 설치됨)
- import: `PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend` from `recharts`.
- 데이터: `{ name: keyword, value: count }[]`, 빈도순 정렬 후 상위 6개 + 나머지 `"기타"` 묶음(7개 이상일 때).
- 색상: 기존 디자인 토큰 활용 — `var(--scoop-strawberry|mango|mint|blueberry|grape|chocolate)` 순환.
- 컨테이너: `h-64`, `ResponsiveContainer width="100%" height="100%"`.
- 빈 상태: `아직 도착한 응답이 없어요 🍒` (기존 톤 유지).
- 총 응답 수 우측 상단 표시(`{total}개`).

### 4) 기타
- types/store/mockData/다른 컴포넌트 변경 없음.
- 발표자 뷰 변경 없음.
- `useState`/`useMemo` 외 신규 의존성 없음.

## 영향받는 파일
- `src/routes/audience.tsx` (하단 카드 분기 + state)
- `src/components/confesta/ToppingInput.tsx` (kind controlled prop 지원)
