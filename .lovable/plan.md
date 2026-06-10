## 변경 요약

발표자가 "키워드 응답"용 질문을 직접 입력하고 여러 개 운영합니다(단, **활성 질문은 동시에 1개**). 각 질문은 별도의 응답 풀과 별도의 원그래프를 갖고, 청중은 활성 질문에 답하고 과거 질문들은 응답 분포 카드로 누적해 봅니다.

## 데이터 모델

### `src/lib/confesta/types.ts`
- 추가: `AnswerPrompt { id; sessionId; text; createdAt; closedAt?: number }`
- `Topping`에 `promptId?: string` 추가 (`kind === "answer"` 일 때 필수, 자유 질문은 미사용).
- `ToppingGate` 에서 `answerPrompt: string` **제거**. `answersOpen`은 유지 — "현재 활성 질문에 응답을 받을지" 토글.
- `DEFAULT_TOPPING_GATE` 동기화.

### `src/lib/confesta/store.ts`
- state에 `answerPrompts: AnswerPrompt[]` 추가, persist에 포함.
- 신규 액션:
  - `createAnswerPrompt(sessionId, text)`: 같은 세션의 열린 prompt(`closedAt == null`)가 있으면 먼저 닫고, 새 prompt를 생성. `setToppingGate(sessionId, { answersOpen: true })` 도 함께 설정.
  - `updateAnswerPrompt(promptId, text)`: 열린 prompt만 텍스트 수정.
  - `closeAnswerPrompt(promptId)`: `closedAt = Date.now()`. 이 세션의 모든 prompt가 닫히면 `answersOpen=false`.
  - `reopenAnswerPrompt(promptId)`: 같은 세션의 다른 열린 prompt를 모두 닫고 이 prompt를 다시 연다(활성 1개 보장).
  - `deleteAnswerPrompt(promptId)`: prompt + 해당 promptId 의 answer toppings 삭제.
- 헬퍼: `getActivePrompt(state, sessionId)` → `closedAt == null` 인 prompt(최신).
- `addTopping(sessionId, text, kind, promptId?)` 시그니처에 `promptId` 추가:
  - `kind === "answer"` → 활성 prompt 존재해야 하고, `gate.answersOpen` true 이어야 함. 호출자가 promptId 전달, 없으면 활성 prompt 사용.

### `src/lib/confesta/mockData.ts`
- 시드에 answer 토핑이 없으므로 변경 불필요. (확인 완료)

## 발표자 UI — `src/components/confesta/ToppingGateControl.tsx`
"키워드 응답 받기" 영역을 다음으로 교체:
- **활성 질문 패널** (있을 때): 인라인 편집 input(`updateAnswerPrompt`) + "마감" 버튼(`closeAnswerPrompt`) + 응답 카운트.
- **새 질문 입력** 행: text + "질문 시작" 버튼 → `createAnswerPrompt` (활성 질문이 있으면 자동으로 마감되고 새 질문이 활성). 자동 마감 시 가벼운 toast.
- **마감된 질문 히스토리** 리스트: 텍스트 + 응답 수 + "다시 열기"/"삭제" 버튼.
- `answersOpen` Switch는 유지 — 활성 질문이 있을 때만 의미; 끄면 입력만 잠그고 prompt는 살아있음.

## 청중 UI — `src/routes/audience.tsx` 키워드 응답 탭
하단 카드(현재 단일 파이차트)를 **세로로 카드 나열** 구조로 교체:
- 그 세션의 `answerPrompts` 를 `createdAt` 최신순으로 정렬.
- 각 prompt 마다 신규 컴포넌트 **`AnswerPromptCard`** 를 렌더.
- prompt가 0개면 안내 카드: "발표자가 곧 키워드 질문을 열어드려요".

상단 "토핑 보내기" 카드의 입력창 처리:
- `toppingKind === "answer"` 일 때 `ToppingInput` 입력창을 **비활성화 + 안내 문구**("아래 질문 카드에서 응답해 주세요")로 표시. 탭 토글 pill row와 활성 prompt 텍스트 카드(있을 때)는 유지.
  - 구현: `ToppingInput` 에 `disableAnswerSubmit?: boolean` prop 추가. true면 form 영역만 비활성/안내 표시.

## 신규 컴포넌트 — `src/components/confesta/AnswerPromptCard.tsx`
Props: `prompt: AnswerPrompt`.
- 헤더: prompt 텍스트 + `활성`/`마감` 배지 + 응답 수.
- 응답 입력 행: prompt가 활성(`closedAt == null`)이고 세션 gate `answersOpen` 이면 표시. submit → `addTopping(sessionId, text, "answer", prompt.id)`. 24자 제한, sprinkle 애니메이션은 생략(스코프 최소화).
- 원그래프: `toppings.filter(t => t.promptId === prompt.id && t.kind === "answer")` 를 텍스트 trim+lower로 그룹핑 → recharts `PieChart`. 비어있으면 "아직 응답이 없어요 🍒". (audience.tsx 의 기존 파이차트 로직을 이쪽으로 이전.)

## 영향받는 파일
- `src/lib/confesta/types.ts` — AnswerPrompt 타입, Topping/Gate 수정
- `src/lib/confesta/store.ts` — answerPrompts 상태/액션, addTopping 시그니처
- `src/components/confesta/ToppingGateControl.tsx` — 질문 관리 UI
- `src/components/confesta/ToppingInput.tsx` — `disableAnswerSubmit` prop, answerPrompt 참조 제거
- `src/components/confesta/AnswerPromptCard.tsx` — 신규
- `src/routes/audience.tsx` — 키워드 응답 탭 하단 영역을 카드 스택으로 교체, 상단 입력 비활성 전달

## 비고
- 활성 질문은 항상 0 또는 1개(세션당). `createAnswerPrompt`/`reopenAnswerPrompt` 가 이 불변성 강제.
- `addTopping` 시그니처 변경은 호출지(`ToppingInput`, `AnswerPromptCard`)만 영향.
- 발표자 뷰의 다른 영역(QuestionStream, ToppingTubScene 등)은 변경 없음 — answer 토핑 필터 그대로 동작.
