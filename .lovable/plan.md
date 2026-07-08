# 좋아요 저장 안 되는 버그 수정 (검토 반영판)

## 증상
- 청중이 하트 눌러도 화면만 켜지고 DB 미반영
- 새로고침 시 하트 리셋, 발표자 화면 개수 0 유지
- DB 확인: `topping_likes` 전체 1행, `toppings.likes > 0`인 행 0개

## 원인
`src/hooks/use-toppings.ts`의 `toggleLike`에서 `onMutate`가 `inflightLikes.add(k)`를 먼저 넣고, 이어 실행되는 `mutationFn`의 첫 줄이 `if (inflightLikes.has(k)) return { skipped: true }`로 조기 리턴한다. **자기 자신이 넣은 마킹을 자기가 보고 매번 skip** → 서버 RPC 절대 호출 안 됨. 추가로 skip 리턴 시 `finally`가 실행되지 않아 Set이 계속 오염된다.

## 수정 방침 (client-only, 단일 파일)

`src/hooks/use-toppings.ts`의 `toggleLike`만 손댄다. 서버 함수/RPC/스키마/RLS/실시간 채널 전부 무변경.

### 변경 내용

1. 모듈 스코프에 `skippedLikeIds: Set<string>` 추가 — onMutate가 skip 결정 시 마킹.
2. `onMutate`:
   - 쿨다운(500ms) 또는 이전 서버 요청 미완(`inflightLikes.has(k)`) 시 → `skippedLikeIds.add(k)` + `{ skipped: true, snapshots: [] }` 반환. **낙관 업데이트 안 함**.
   - 통과 시 → `lastLikeAt.set(k, now)`, `inflightLikes.add(k)`, 스냅샷 저장 + 낙관 업데이트.
3. `mutationFn`:
   - 첫 줄: `if (skippedLikeIds.has(k)) { skippedLikeIds.delete(k); return { ok: false, skipped: true }; }` — onMutate 신호를 존중하여 서버 호출 안 함.
   - 통과 시: 서버 RPC 호출, `finally { inflightLikes.delete(k); }`.
   - **자기 onMutate 마킹을 재확인하는 로직 제거**.
4. `onSuccess`/`onError`의 `ctx.skipped` 분기는 그대로 유지 (스냅샷 롤백 스킵, likeGuards 미갱신).

## 서버비/기능 영향 검토

- **서버비**: 정상 클릭당 RPC 1회 → 원래 설계 수준. 현재는 0회라 정상화. 500ms 쿨다운·인플라이트 가드로 연타 폭주 방지. realtime 이벤트도 정상 클릭 1회당 UPDATE 1 + INSERT/DELETE 1로 원래 설계 그대로.
- **realtime 정합성**: 기존 `op_id` dedupe(`toggle_topping_like` 3인자 오버로드)와 `likeGuards`(2초 TTL) 로직 그대로 동작. 자신이 낙관 업데이트한 값이 realtime로 되돌려지는 race는 이미 방어됨.
- **발표자/관리자 화면**: `list_toppings_with_my_like_v2`가 `toppings.likes`를 반환하고 RPC가 그 컬럼을 갱신 → realtime UPDATE로 자동 반영. 코드 변경 없음.
- **다른 기능 영향 없음**:
  - `togglePin`/`toggleAddressed`/`addTopping`/`deleteOwn`: 별개 뮤테이션, 미변경.
  - 지난 턴에 수정한 댓글 카운트 로직: 관련 없음.
  - `useMyToppings`, 북마크, 슬라이드, 스태프, 관리자: 무관.
- **엣지 케이스**:
  - 네트워크 오류 → `onError`가 스냅샷 롤백, `finally`가 `inflightLikes` 정리.
  - 서로 다른 토핑 연속 클릭 → 키가 달라 간섭 없음.
  - 쿨다운 스킵된 클릭 → 서버 호출 없음, 화면도 안 바뀜(직관적).

## 검증 절차

1. 청중 화면에서 하트 클릭 → DB `topping_likes` INSERT, `toppings.likes` +1 확인 (`supabase--read_query`).
2. 새로고침 → 하트 상태·개수 유지.
3. 발표자 화면에서 실시간 개수 증가.
4. 500ms 내 연타 → 서버 호출 1회만.
5. 두 번째 클릭으로 좋아요 취소 → DELETE + `likes` -1 확인.
