## 원인

`QuestionStream`, `ToppingWordCloud`, `StageMarquee` 셋 모두 zustand 셀렉터에서 `s.toppings.filter(...)`로 **매 호출마다 새 배열**을 반환합니다. React의 `useSyncExternalStore`는 getSnapshot이 매번 다른 참조를 돌려주면 무한 루프로 판정하고 **Minified React error #185**를 던집니다. 발표자 화면에서 질문/워드 탭을 누르면 이 컴포넌트들이 처음 마운트되어 오류 페이지가 나타납니다.

## 변경

세 컴포넌트 모두 동일 패턴으로 수정:
- 셀렉터는 안정 참조인 `s.toppings`만 가져온다.
- 세션별 필터/정렬은 컴포넌트 안 `useMemo`에서 수행한다.

### 1. `src/components/confesta/QuestionStream.tsx`
```ts
const allToppings = useConfestaStore((s) => s.toppings);
const toppings = useMemo(
  () => allToppings.filter((t) => t.sessionId === sessionId),
  [allToppings, sessionId],
);
```

### 2. `src/components/confesta/ToppingWordCloud.tsx`
동일 패턴으로 교체 (기존 `useMemo` 의존성 배열은 그대로 유지).

### 3. `src/components/confesta/StageMarquee.tsx`
`import { useMemo } from "react"` 추가 후, 필터 + 정렬 + slice(12)를 하나의 `useMemo`로 감싼다.

## 검증

- 발표자 화면 → 질문/워드 탭 클릭 시 오류 페이지 없이 카드/워드클라우드 렌더링.
- 무대 모드 하단 마퀴도 정상 표시.

UI/스타일 변경 없음. 셀렉터 안정화만 수행.
