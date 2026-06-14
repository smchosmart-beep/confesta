## 목표
영수증의 키워드 응답 토핑(`kind === "answer"`)을 응답값만 노출하지 말고, **발표자가 던진 질문(prompt)과 응답을 함께** 표시합니다. 단순 질문 토핑(`kind === "question"`)은 지금처럼 텍스트 한 줄만 노출합니다.

예시 형태:
```
토핑 #8   선호하는 LLM은? - gemini
```

## 수정 범위

### 1. `src/lib/confesta/toppings.functions.ts` (listMyToppings)
- `ToppingDTO`에 `promptText: string | null` 필드 추가.
- `listMyToppings` 핸들러에서 `kind === "answer"`이고 `prompt_id`가 있는 행들의 `prompt_id`를 수집해, `answer_prompts` 테이블에서 `id, text`를 한 번에 조회한 뒤 매핑하여 `promptText`를 채웁니다. (질문 토핑은 `null`)
- `listToppings`(발표자/청중 공용)는 영수증과 무관하므로 동일한 필드를 안전하게 `null`로 채워 타입 호환만 맞춥니다(별도 조회 없음 → 비용 영향 없음).

### 2. `src/components/confesta/ReceiptCard.tsx`
- 실제 영수증 토핑 렌더링:
  - `kind === "answer"`: 우측에 `질문 - 응답` 형태로 표시. 질문이 비어 있으면 응답만.
  - `kind === "question"`(기본): 기존처럼 텍스트만.
- 길이가 길 경우 줄바꿈은 기존 `break-keep leading-snug` 유지. 우측 정렬 유지.
- 샘플 영수증(`SAMPLE_TOPPING_TEXTS`)에도 1~2개 항목을 `질문 - 응답` 예시로 교체해 실제 형태와 동일하게 보여줌. 예: `선호하는 LLM은? - gemini`.

### 3. 비고
- 새 서버 함수, 새 테이블, 새 인덱스, 새 권한 변경 없음. 기존 RLS/grants 그대로.
- 추가 쿼리는 영수증을 보는 시점의 `listMyToppings` 안에서 prompt_id 집합 한 번만 in-query → 비용 영향 미미.

## 검증
- 응답 토핑이 있는 청중에게 영수증을 보여줬을 때 "질문 - 응답" 형태로 출력되는지.
- 질문 토핑만 있는 경우 기존 동작과 동일한지.
- 발표자 화면(`listToppings` 사용 영역)에 회귀가 없는지(타입만 추가, null).