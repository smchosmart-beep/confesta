# A안 리스크 재검토 (실제 코드/스키마 대조)

계획을 `use-toppings.ts` 실체와 마이그레이션의 `REPLICA IDENTITY` 설정에 맞춰 재검증. 결과: **A안은 전반적으로 안전**하나 **3가지 보완 필수**, **1건 사전 이슈**(A안이 유발한 것은 아님) 발견.

## 사전 조사 결과

- REPLICA IDENTITY FULL: `toppings`, `answer_prompts`, `topping_gates` ✔ → DELETE payload에 전체 행 포함, 필터·패치 안전.
- REPLICA IDENTITY DEFAULT: `topping_comments` ✗ → DELETE 시 PK만 전송. 아래 이슈 1 참조.
- 좋아요 경합 방지 인프라(`likeGuards` / `inflightLikes` / `lastLikeAt`)와 낙관 업데이트가 이미 정교하게 구현됨 → 패치 로직이 이 가드와 반드시 정합해야 함.

## 기능 오작동 리스크

### ① 좋아요 UPDATE 이벤트가 낙관/가드값을 덮어씀 (반드시 대응)
현재 `applyLikeGuards`는 `queryFn`(refetch) 안에서만 적용됨. A안에서 realtime UPDATE payload를 곧장 `setQueryData`로 반영하면 TTL 내 서버 최신 카운트가 사용자의 낙관값을 되돌릴 수 있음.

**대응**: 패치 진입점에서 `applyLikeGuards`를 다시 통과. 즉 `toppings` UPDATE 패치는 raw payload로 replace → 결과 배열을 `applyLikeGuards(sessionId, deviceId, next)`로 감싼 뒤 setQueryData. `likedByMe`는 payload에 없으므로 이전 row 값 유지가 기본, 가드가 있으면 가드값 우선.

### ② 자기 자신의 INSERT 이벤트 중복 처리
`addTopping.onSuccess`가 이미 invalidate. realtime payload도 도착 → 리스트에 중복 append 위험.
**대응**: 패치 시 `id` 존재 검사(dedupe) 필수. 4개 훅 공통.

### ③ v2 서버 필터 완전 복제 불가
`list_toppings_with_my_like_v2`는 `kind='answer' OR pinned OR addressed OR rn<=100` 로 트리밍. 새 question INSERT 시 이미 100건 넘으면 리스트에 넣지 않는 게 서버 결과와 일치하지만 클라 랭킹 재계산은 정확하지 않음.
**실용적 타협**: 언제나 INSERT는 append(dedupe 후). 리스트가 200건을 초과할 때만 클라에서 오래된 non-pinned/non-addressed/non-answer 항목을 잘라 안전 상한 유지. 서버-클라 정합성은 다음 focus/health 회복 invalidate에서 자연 수렴.

### ④ `prompt_text` join 결손
INSERT payload에 없음. `qc.getQueryData(["prompts", sessionId])`로 조회, 미스 시 `null`(UI 관용). UPDATE 시 `prompt_id`가 바뀌면 이전 prompt_text가 stale → 이때만 안전망 `invalidateQueries`(드문 케이스).

### ⑤ REPLICA IDENTITY DEFAULT인 `topping_comments`의 DELETE 이벤트 유실 (사전 이슈)
Realtime `filter: session_id=eq.X` 는 DELETE에서 `old` 레코드로 평가됨. REPLICA IDENTITY DEFAULT면 `old`에 PK만 담겨 session_id 필터가 매칭되지 않아 **필터된 채널에 DELETE가 전달되지 않음**. 이는 현재도 동일한 사전 이슈(현재 코드도 invalidate가 트리거되지 않음).
**대응(A안과 별개, 함께 처리 권장)**: 마이그레이션 1줄 추가 — `ALTER TABLE public.topping_comments REPLICA IDENTITY FULL;`. 이후 DELETE payload 정상 도착 → 패치 정상.

### ⑥ 재연결 이벤트 유실
채널이 CLOSED→SUBSCRIBED 회복 사이 이벤트는 누락. 훅에서 `useRealtimeHealth` 값 관찰 → false→true 전이 시 해당 쿼리 1회 invalidate. 2000명 동시 회복 시에도 이미 backoff jitter(1~30s)로 분산 → refetch 폭주 아님.

### ⑦ 디바운스 제거로 렌더 폭주
setQueryData는 in-memory. React 18 자동 배칭 + 각 훅의 `useMemo`(commentsByTopping 등) 재계산은 O(N). 세션당 초당 이벤트 수백까지 여유. 문제되면 훅 레벨에서 rAF micro-batch 도입 가능.

## 서버비 영향 (순감소)

| 항목 | 변화 | 근거 |
|---|---|---|
| Realtime 유래 서버함수 호출 | **-99%** | invalidate→refetch 경로 제거 |
| DB read QPS (list_* v2 등) | **-95%+** | 이벤트 수와 무관, 초기 로드/포커스/재연결 resync만 |
| Realtime WebSocket / 이벤트 페이로드 | 무변화 | 발생량 동일 |
| Egress | 소폭 감소 | 클라 refetch 응답 트래픽 소멸 |
| Cloud 인스턴스 CPU | 감소 | PostgREST · DB 파싱/계획 부담 감소 |

**과다 부과 요인 없음**. 단, DELETE fix 위해 topping_comments를 REPLICA IDENTITY FULL로 바꾸면 그 테이블의 UPDATE/DELETE 이벤트 payload 크기가 증가 → 트래픽 미미 상승. 실무상 무시 가능.

## 다른 기능 영향

| 대상 | 판정 | 비고 |
|---|---|---|
| 좋아요 낙관/가드/쿨다운 | 안전 | `applyLikeGuards`를 패치 경로에도 재사용 |
| pin/addressed 낙관 토글 | 안전 | mutation onSuccess 서버 확정값이 우선, realtime UPDATE 뒤이어 도착해도 동일 값 |
| addTopping onSuccess invalidate | 유지 | 본인 1건이라 서버 부담 무시 가능. dedupe 있으면 중복 append 없음 |
| deleteOwn onSuccess invalidate | 유지 | 동일 |
| 관리자(`list_all_toppings_admin`) | 무영향 | realtime 미사용 |
| BackgroundToppings/WordCloud 등 파생 뷰 | 무영향 | 동일 쿼리 구독 |
| `subscribeGlobalTable` (orders/session_slots) | 무영향 | 손대지 않음 |
| SSR fallback | 무영향 | `useSyncExternalStore` 서버 스냅샷 true 유지 |
| 채널 통합(직전 변경) | 정합 | 패치 경로가 kind별 리스너 Set에 붙음 |

## 특수 케이스

- **다중 탭**: 각 탭이 자체 QueryClient. 탭A의 mutation onSuccess로 A만 즉시 반영, 탭B는 realtime payload로 반영. 정상.
- **역할 전환/세션 전환**: 쿼리키 변경 → 신규 쿼리 첫 fetch로 초기화. 패치는 신규 키에만 적용. 정상.
- **payload 타입 mismatch**: 방어적 try/catch → 실패 시 invalidate fallback. 안전망.
- **liked_by_me 계산의 초기값**: INSERT payload에는 없음. 본인 device_id 일치 시 `false`로 시작(작성 직후 좋아요 없음), 이후 좋아요 mutation이 갱신. 정합.

## 롤백
훅 4개 + realtime-channel.ts 이전 커밋 복구. topping_comments FULL 마이그레이션은 별도 revert 마이그레이션(단순 `REPLICA IDENTITY DEFAULT`).

## 결론
- **기능 오작동**: 위 ①②③④⑥ 대응을 구현에 반영하면 없음.
- **서버비 과다 부과**: 없음(순감소).
- **다른 기능 악영향**: 없음.
- **사전 이슈 병행 처리 권장**: `topping_comments REPLICA IDENTITY FULL` 마이그레이션 1줄 추가(A안과 별개로도 가치 있음).

이 보완 3건 + 마이그레이션 1줄을 A안 계획에 포함해 진행 승인 부탁드립니다.
