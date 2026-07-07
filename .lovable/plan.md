## G안 리스크 재검토 결과 및 최종안 (보완 3건 포함)

### 검토 결과 요약

| 항목 | 판정 | 근거 |
|---|---|---|
| 기능 오작동 위험 | 낮음 | `topping_comments REPLICA IDENTITY FULL` 이미 적용 → DELETE payload에서 topping_id 접근 가능, counts -1 정확 반영 |
| 서버비 증가 위험 | 없음 (오히려 감소) | 초기 payload -98%, 뮤테이션당 함수 호출 2→1 |
| 다른 기능 악영향 | 없음 | likes/gate/prompts/pin/addressed 완전 격리. `subscribeToppingComments`는 세션당 채널 1개(기존 재사용) |
| 회귀 위험 | 낮음 | 기존 `listToppingComments` 유지, 컴포넌트 3개만 훅 교체 |

### 발견한 실질 리스크 3건 → 모두 보완안에 반영

**리스크 1 — "-98%" 이 과장됨**
- 초안대로 서버 함수에서 `.select('topping_id').eq(...)` 후 JS 그룹핑 시: 댓글 500개 → row 500개 반환 → ~18KB (실제 감소율 ~80%)
- **대응**: DB에서 GROUP BY로 집계하는 RPC `count_comments_by_session` 신설. 30 topping → ~1.5KB (실제 -98%)

**리스크 2 — 뮤테이션당 서버 함수 호출이 오히려 증가**
- 초안 `onSuccess`에서 `["comment-counts"]`, `["comment-thread"]` 두 캐시 각각 invalidate → 뮤테이션 1회 = 함수 호출 3회 (현재 2회)
- 2000명 시나리오에서 댓글 활동 몰릴 때 부하 역증가
- **대응**: 낙관적 업데이트로 invalidate 제거. `onMutate`에서 thread append + counts +1, `onError`에서 rollback. Realtime과 id 기준 dedupe

**리스크 3 — Spotlight 모달의 UX 저하**
- Presenter가 스포트라이트한 질문의 댓글이 클릭 전엔 안 보임
- **대응**: `PresenterCommentBlock`에 `defaultOpen` prop 추가, Spotlight에서만 true

**추가 확인 (수용)**
- Presenter가 `QuestionStream`에서 여러 카드 댓글을 일괄 스캔하려면 카드별 open 필요 — 필요 시 별도 "모두 펼치기" 토글 추후 추가 가능. 이번 범위 밖

---

## 최종 구현안

### 변경 파일

| 유형 | 경로 | 작업 |
|---|---|---|
| Migration | 신규 | RPC `count_comments_by_session` 생성 + GRANT EXECUTE |
| 서버 함수 | `src/lib/confesta/comments.functions.ts` | `listToppingCommentCounts`, `listCommentsByTopping` 추가. `listToppingComments`는 유지(회귀 방지) |
| 훅 | `src/hooks/use-topping-comments.ts` | `useSessionToppingComments` 제거, `useToppingCommentCounts` + `useToppingCommentThread` 신규 |
| Bootstrap | `src/lib/confesta/session-bootstrap.functions.ts`, `src/hooks/use-session-bootstrap.ts` | `comments` 필드 → `commentCounts`로 교체 |
| 컴포넌트 | `QuestionCommentBlock.tsx`, `PresenterCommentBlock.tsx`, `QuestionSpotlightModal.tsx`, `audience.tsx` 호출부 | 신규 훅으로 교체, Spotlight `defaultOpen` |

### 1. 마이그레이션 (보완 1)

```sql
CREATE OR REPLACE FUNCTION public.count_comments_by_session(_session_id text)
RETURNS TABLE(topping_id uuid, cnt int)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT topping_id, COUNT(*)::int
  FROM public.topping_comments
  WHERE session_id = _session_id
  GROUP BY topping_id;
$$;
GRANT EXECUTE ON FUNCTION public.count_comments_by_session(text)
  TO anon, authenticated, service_role;
```

기존 인덱스 `topping_comments_session_created_idx (session_id, created_at)` 사용.

### 2. 서버 함수 신규 2개

- **`listToppingCommentCounts({ sessionId })`** → RPC 호출 → `{ counts: Record<toppingId, number> }`
- **`listCommentsByTopping({ toppingId, deviceId? })`** → 단일 topping 본문 (created_at ASC) → `{ comments: CommentDTO[] }`

### 3. 훅 재구성

**`useToppingCommentCounts(sessionId)`**
- queryKey `["comment-counts", sessionId]`, staleTime 15s, `refetchInterval: healthy ? false : 60_000`
- 세션당 `subscribeToppingComments` 1회 등록 (기존 채널 재사용):
  - INSERT: counts[topping_id] +1, 열린 thread 캐시(있으면) append (id dedupe)
  - DELETE: counts[old.topping_id] -1 (REPLICA IDENTITY FULL 활용), 열린 thread에서 제거
- 반환: `getCount(toppingId) => number`

**`useToppingCommentThread(sessionId, toppingId, enabled)`**
- queryKey `["comment-thread", toppingId, deviceId]`
- `enabled: enabled && !!toppingId && !!deviceId`, staleTime 15s, `refetchInterval: healthy ? false : 60_000`
- **낙관적 뮤테이션** (보완 2):
  - `onMutate`: 임시 id로 thread append + counts +1 patch, rollback context 반환
  - `onSuccess`: 서버 응답의 실제 id로 임시 항목 교체 (Realtime이 먼저 도착했으면 임시만 제거)
  - `onError`: rollback (임시 제거 + counts -1)
  - **invalidateQueries 호출 없음** → 뮤테이션당 서버 함수 1회
- Realtime dedupe: 캐시 patch 시 항상 `findIndex(c => c.id === row.id)` 확인 후 upsert

**`useSessionToppingComments` 제거** (호출부 없음 확인 필요 — audience.tsx 등 3개 컴포넌트 교체 후).

### 4. Bootstrap 반영

`session-bootstrap.functions.ts`: 기존 전체 댓글 배열 대신 RPC로 카운트만 반환. `comments` → `commentCounts` (Record).

`use-session-bootstrap.ts`:
```ts
if (r.commentCounts) qc.setQueryData(["comment-counts", sessionId], { counts: r.commentCounts });
```

기존 `["topping-comments", sessionId, deviceId]` seed 삭제.

### 5. 컴포넌트

- **`QuestionCommentBlock`** (audience): `useToppingCommentCounts`로 배지, open 상태에서 `useToppingCommentThread(..., open)` 로 본문
- **`PresenterCommentBlock`**: 동일 패턴 + `defaultOpen?: boolean` prop 추가
- **`QuestionSpotlightModal`**: `<PresenterCommentBlock defaultOpen />` (보완 3)
- **`QuestionStream`**: 기존 open 토글 유지 (`defaultOpen` 미전달)

### 서버 부하 비교 (2000명 기준)

| 항목 | 현재 | G안 최종 |
|---|---|---|
| 초기 payload/user | ~90KB | ~1.5KB (-98%) |
| 초기 서버 함수/user | 1 (bootstrap) | 1 |
| 뮤테이션당 함수 호출 | 2 | 1 (-50%) |
| Thread REST/user | 0 | 사용자당 open한 topping 수 (평균 3~5) |
| Realtime 채널 | 세션당 1 | 세션당 1 (동일) |

### 검증 순서

1. 마이그레이션 후 `SELECT * FROM count_comments_by_session('...')` 직접 확인
2. Network: audience 초기 로드에 댓글 본문 payload 부재, `commentCounts`만 존재
3. 댓글창 open → `listCommentsByTopping` 1회, 재open 시 캐시 hit (staleTime 15s 내)
4. 다른 사용자 댓글 INSERT → 배지 실시간 +1, 열린 사용자는 append (dedupe 확인)
5. 낙관적 add: 즉시 표시 → 서버 응답 후 실 id 교체 → Realtime 도착 시 중복 없음
6. Spotlight 모달 open → 댓글 즉시 로드
7. Realtime 강제 종료 → counts/thread 60s 폴백 정상

### 롤백 순서

컴포넌트 3개 원복 → 훅 원복 → bootstrap 필드 원복. RPC와 신규 서버 함수는 남겨도 무해.
