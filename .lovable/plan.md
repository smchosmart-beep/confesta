## 목표
30명 규모 동시 접속 세션에서 질문/댓글/좋아요 폭주 시 발생하는 DB·네트워크 과부하를 3축(인덱스 / Realtime debounce / 캐시)으로 해소합니다. 검토에서 지적된 3가지 보정 사항을 반영했습니다.

## 변경 사항

### 1. DB 인덱스 최적화 (마이그레이션)

**추가 인덱스**
- `toppings(session_id, created_at DESC)` — `list_toppings_with_my_like` 세션별 최신순 조회(23,500회 호출) 커버.
- `topping_likes(device_id, topping_id)` — 좋아요 상태 EXISTS 서브쿼리(20,166회) 커버.
- `topping_comments(session_id, created_at)` — 댓글 목록 조회 커버.

**중복 인덱스 제거 (검토 반영 #1)**
- `DROP INDEX IF EXISTS public.toppings_session_id_idx;` — 신규 복합 인덱스가 상위집합.
- `DROP INDEX IF EXISTS public.topping_comments_session_idx;` — 신규 복합 인덱스가 상위집합.
- `topping_likes` 기존 단일 인덱스는 다른 경로에서 쓰일 수 있어 유지.

**실행 타이밍 (검토 반영 #3)**
- 마이그레이션은 세션 비활성 시간대에 승인·실행. `CREATE INDEX`는 트랜잭션 내 실행이므로 대상 테이블에 짧은 ACCESS EXCLUSIVE 락이 걸리지만, 30명 세션이 진행 중이 아니면 체감 없음.

### 2. Realtime debounce 상향 (`src/lib/confesta/realtime-channel.ts`)
- `NOTIFY_DEBOUNCE_MS`: 200ms → 600ms.
- ±200ms 랜덤 jitter 추가 → 30명 동시 refetch 폭주(thundering herd) 방지.
- 낙관적 업데이트 덕분에 본인 액션은 즉시 반영, 타인 액션 반영만 최대 ~800ms 지연.

### 3. 캐시 정책 조정 (`src/hooks/use-toppings.ts`, `use-topping-comments.ts`, `use-answer-prompts.ts` 등 realtime 구독 훅)
- `staleTime`: 5s → 15s.
- **`refetchOnWindowFocus: !healthy` (검토 반영 #2)** — Realtime 연결이 살아있으면 포커스 refetch 스킵, 끊겼을 때만 복구용 refetch 수행. 오프라인 복귀·백그라운드 탭 대응력 유지.
- 폴백 폴링(`refetchInterval`): Realtime unhealthy일 때만 30s → 60s.

## 예상 효과 및 리스크

**효과**
- `toppings` 세션별 조회 수백 ms → 수 ms 수준으로 단축(인덱스 스캔).
- 30명 동시 액션 시 서버로 향하는 refetch 요청 수 약 60~70% 감소.
- Realtime 트래픽/Data API 호출 감소로 오히려 비용 절감.

**리스크 & 완화**
- Realtime 반영 지연 최대 ~800ms → 낙관적 업데이트로 UX 영향 없음.
- 인덱스 추가로 쓰기 오버헤드 미미하게 증가 → 현재 쓰기량 대비 무시 가능.
- 마이그레이션 락 → 비활성 시간대 실행.
- 기존 기능 로직 변경 없음(캐시/구독 파라미터만 조정) → 오작동 가능성 낮음.

## 파일 목록
- `supabase/migrations/*` — 인덱스 3개 CREATE + 중복 인덱스 2개 DROP
- `src/lib/confesta/realtime-channel.ts` — debounce 600ms + jitter
- `src/hooks/use-toppings.ts` — staleTime/refetch 정책
- `src/hooks/use-topping-comments.ts` — staleTime/refetch 정책
- `src/hooks/use-answer-prompts.ts` 등 realtime 구독 훅 — 동일 정책 적용

## 진행 순서
1. 마이그레이션 승인 → 비활성 시간대 실행 → 타입 재생성.
2. `realtime-channel.ts` debounce/jitter 수정.
3. 훅들의 캐시 정책 조정.
4. 실사용 세션에서 refetch 빈도·응답 시간 관찰.
