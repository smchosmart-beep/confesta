# 닫힌 질문에도 응답 허용

## 동작 변경 요약

- 발표자가 질문을 "마감"하거나 새 질문으로 교체해도, **청중은 과거 질문에 계속 응답을 보낼 수 있음**.
- `answersOpen` 스위치(전체 응답 수신 토글)는 그대로 유지 — 이걸 꺼야만 모든 응답이 차단됨.
- "마감" 라벨은 의미가 달라지므로 **"보관(아카이브)"** 으로 변경. 보관된 질문은 발표자 화면에서 히스토리로 내려가지만 청중 카드는 계속 입력 가능.

## 변경 파일

### 1) `src/lib/confesta/store.ts`
- `addTopping` 내 답변 분기: `p.closedAt != null` 체크를 제거. 프롬프트가 해당 세션에 존재하기만 하면 허용. `answersOpen === false`일 때만 차단.
- 클라이언트가 `promptId`를 명시하지 않은 경우(레거시 호출)에만 활성 프롬프트로 폴백하던 로직은 유지.
- `closeAnswerPrompt` / `reopenAnswerPrompt`는 그대로(활성 1개 invariant 유지). 단 close 시 `answersOpen`을 자동으로 false로 내리던 동작은 제거 — 보관해도 응답은 계속 받아야 하므로.

### 2) `src/components/confesta/AnswerPromptCard.tsx`
- `canSubmit = gate.answersOpen` 로 단순화 (isActive 조건 제거).
- 상태 배지: "진행 중" / "보관됨" 두 가지 모두 입력창 표시. `answersOpen === false`인 경우에만 입력창을 비활성화하고 "응답 수신이 꺼져 있어요" 안내.
- 보관된 카드는 시각적으로 약간 흐리게(`opacity-90` + muted 테두리) 처리해 활성 카드와 구분.

### 3) `src/components/confesta/ToppingGateControl.tsx`
- "마감" 버튼 라벨 → "보관"으로 변경, 히스토리 섹션 제목도 "마감된 질문" → "보관된 질문".
- 히스토리 항목에 "응답 받는 중" 표시(응답이 계속 들어올 수 있음을 발표자에게 알림).
- `answersOpen` 스위치 설명 문구를 "모든 질문에 대한 응답 수신을 켜고 끕니다"로 보강.

### 4) `src/routes/audience.tsx`
- 카드 정렬: 활성 질문을 맨 위, 그 아래에 보관된 질문을 최신순으로 정렬(현재 createdAt 정렬에서 활성 우선 정렬 추가).

## 영향 없음

- 데이터 구조(`AnswerPrompt`, `Topping.promptId`)는 그대로. 마이그레이션 불필요.
- 영수증/차트 집계는 `promptId` 기반이라 그대로 동작.
