## 목표

관리자 평면도 카드의 **"토핑확인"** 버튼이 현재 아무 동작도 하지 않음. 클릭 시 해당 공간(=세션 slot)의 토핑을 모달로 보여준다. 키워드 응답 섹션은 발표자 화면처럼 **파이 통계 그래프**도 함께 표시한다.

## 모달 구성

해당 슬롯 세션ID(`makeSlotKey(day, period, room)`) 기준 토핑을 조회 후 두 섹션:

1. **질문 토핑** (`kind === "question"`)
   - 좋아요 내림차순 → 최신순 정렬
   - 각 항목: 본문 텍스트, 좋아요 수, `pinned`/`addressed` 배지

2. **키워드 응답 토핑** (`kind === "answer"`)
   - `promptId`(질문)별로 그룹화. 각 그룹 카드:
     - **헤더**: 질문 문구(`promptText`) + 응답 수 뱃지
     - **좌측**: `질문 - 응답` 리스트 (응답 텍스트, 최신순)
     - **우측**: 발표자 화면과 동일한 `AnswerPie`(파이 차트)
   - 모바일/좁은 폭에서는 위·아래 스택, 넓은 폭에서는 좌우 2열 그리드

토핑 0건이면 빈 상태 안내. 로딩 중에는 짧은 안내문.

## 변경 사항

1. **`src/lib/confesta/toppings.functions.ts` — `listToppings`**
   - 현재 모든 토핑의 `promptText`를 `null`로 반환. `listMyToppings`와 같은 방식으로 `kind === "answer"` 항목의 `prompt_id` 집합을 모아 `answer_prompts`에서 텍스트를 가져와 `promptText`를 채워 반환.

2. **`src/components/confesta/SlotToppingsModal.tsx`** (신규)
   - Props: `open`, `onClose`, `sessionId`, `title`.
   - 데이터 소스: 발표자 화면과 동일하게 **`useSessionToppings(sessionId)`** (realtime 구독 포함)을 사용 — `AnswerPie`도 동일 훅을 쓰므로 일관성 유지.
   - shadcn `Dialog`, 내용은 `max-h-[80vh] overflow-y-auto`.
   - 응답 그룹 렌더링 시 `<AnswerPie sessionId={sessionId} promptId={group.promptId} />` 재사용.
   - `promptId`가 `null`인 답변(과거 데이터)이 있을 경우 "분류되지 않은 응답" 그룹으로 별도 표기, 단 파이 차트는 생략.

3. **`src/routes/admin.tsx`**
   - 서브 공간 카드의 "토핑확인" 버튼(라인 905~918 부근)을 작은 셀 컴포넌트 `SlotToppingsButton`으로 캡슐화. 내부에서 `useState`로 모달 open 관리 → `SlotToppingsModal` 마운트.
   - `sessionId = makeSlotKey(day, period, sub.label)`, `title = displayTitle || sub.label`.

## 범위 밖

- 관리자 권한의 핀/처리완료/삭제 등 편집 기능 없음 (조회 전용).
- 발표자 화면, 청중 화면 UI는 변경하지 않음.
- 평면도 카드의 수치/레이아웃은 변경하지 않음.
