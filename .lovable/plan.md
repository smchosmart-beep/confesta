# 키워드 응답 토핑을 질문(prompt)별로 분리

## 문제
`ToppingTubScene`이 세션의 모든 `kind === "answer"` 토핑을 한꺼번에 모아서 키워드를 추출하기 때문에, 발표자가 여러 키워드 질문(answer prompt)을 냈을 때 질문1·질문2의 응답이 한 통에 섞여서 내려옵니다.

## 해결 방향
발표자 화면 토핑 통 바로 위에 **프롬프트(질문) 선택 탭**을 두고, 선택된 프롬프트의 응답만 키워드 추출 대상이 되도록 합니다.

- 기본 선택: 현재 활성 프롬프트(`active_prompt_id`). 활성이 없으면 가장 최근 프롬프트.
- 탭 옵션: 해당 세션의 모든 answer prompt(최신순). 라벨은 프롬프트 텍스트(긴 경우 truncate). 활성 프롬프트엔 작은 점/뱃지 표시.
- 프롬프트 0개일 땐 별도 안내, 프롬프트는 있지만 응답 0개일 땐 다른 안내(아래 빈 상태 분기 참조).

## 변경 사항

### 1. `src/components/confesta/ToppingTubScene.tsx`
- `Props`에 `promptId?: string | null` 추가 (optional, 미지정 시 기존 동작 유지).
- `toppings` 필터: `t.kind === "answer" && (promptId ? t.promptId === promptId : true)`.
- **빈 상태 메시지 2가지 분기**:
  - 호출자가 prompts 0개임을 알리기 위해 `Props`에 `promptsCount?: number` 추가 (또는 `emptyReason: "no-prompts" | "no-answers"`).
  - `no-prompts` → "키워드 질문을 먼저 만들어 주세요"
  - `no-answers` → "이 질문에 대한 응답을 기다리는 중…"

### 2. `src/routes/presenter.tsx` (UnlockedSlotView 좌측 토핑 컬럼)
- `useAnswerPrompts(sessionId)`, `useToppingGate(sessionId)` 호출(이미 다른 곳에서 쓰던 훅이라 React Query 캐시 공유 → 추가 네트워크 없음).
- 로컬 state: `selectedPromptId: string | null`, `userPicked: boolean`.
- **선택 동기화 로직 (`useEffect`)**:
  1. prompts 비어있음 → `selectedPromptId = null`.
  2. `userPicked === false` → 항상 `activePromptId ?? prompts[0].id` 따라감.
  3. `userPicked === true` → 현재 selected가 prompts에 존재하면 유지. **존재하지 않으면(삭제됨) `userPicked`를 다시 false로 리셋**하고 active로 fallback.
- 탭 UI: `ToppingGateControl` 아래·`ToppingTubScene` 위에 칩 행 렌더.
  - `flex gap-2 overflow-x-auto` 한 줄 가로 스크롤(통 세로공간 보존).
  - 칩: `max-w-[160px] truncate` + 전체 텍스트는 `title` 속성으로 hover 표시.
  - 활성 프롬프트엔 작은 점/뱃지(예: 좌측 `●` 또는 우측 "라이브").
  - (선택) 칩 우측에 해당 프롬프트의 응답 개수 뱃지 — 발표자가 콘텐츠 있는 탭을 한눈에 파악.
  - 클릭 시 `setSelectedPromptId(id); setUserPicked(true);`.
- `<ToppingTubScene sessionId={sessionId} promptId={selectedPromptId} promptsCount={prompts.length} />` 로 전달.

### 3. 데이터/스키마
- 변경 없음. `toppings.prompt_id`는 이미 존재.

## 부작용 검토 (확정)
- **서버비**: 추가 쿼리·realtime 채널 0개. 클라이언트 필터만 추가.
- **다른 화면**: audience/admin/staff 코드 변경 없음. `ToppingTubScene`의 새 props는 optional이라 기존 호출처도 그대로 동작.
- **실시간성**: `subscribeToppings` 그대로 → 필터링은 useMemo라 새 토핑 도착 시 정상 반영.
- **엣지케이스**:
  - 선택한 프롬프트가 삭제되어도 위 fallback 로직으로 dangling 방지.
  - 신규 프롬프트 활성화 시: 사용자가 한 번도 안 골랐으면 자동 추종, 명시적으로 골랐으면 그 선택 유지.
- **성능**: `extractKeywords`는 5초마다 재계산되지만 필터 후 더 적은 토핑만 처리 → 오히려 가벼워짐.

## 영향 파일
- 수정: `src/components/confesta/ToppingTubScene.tsx`, `src/routes/presenter.tsx`
- 신규/마이그레이션: 없음
