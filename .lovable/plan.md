## 목표
좋아요 클릭 시 화면의 1 표시가 서버 저장값과 계속 일치하도록, 서버 API를 "토글"에서 "명시적 최종 상태 설정"으로 바꿉니다. 낙관 업데이트도 요청된 최종 상태에 정렬되어 자기 자신 요청으로 인해 1→0으로 되돌아가는 경로를 제거합니다.

## 변경 요약

### 1. DB: 새 함수 `set_topping_like` (migration)
- 시그니처: `set_topping_like(_topping_id uuid, _device_id uuid, _liked boolean, _op_id uuid) returns table(liked boolean, likes integer)`
- 동작:
  - `_liked = true` → `INSERT ... ON CONFLICT DO NOTHING`. 실제 삽입된 경우에만 `toppings.likes += 1`, `op_id = _op_id`.
  - `_liked = false` → `DELETE ...`. 실제 삭제된 경우에만 `toppings.likes = GREATEST(likes-1, 0)`, `op_id = _op_id`.
  - 어느 경우든 마지막에 현재 `likes`를 조회해 `(_liked, likes)` 반환. 동일 요청 재전송에 대해 완전 idempotent.
- `SECURITY DEFINER`, `search_path = public`, 기존 `toggle_topping_like`는 롤백 안전을 위해 그대로 둠(호출자 없음).
- `GRANT EXECUTE ... TO anon, authenticated` (기존 `toggle_topping_like`와 동일 grant).

### 2. 서버 함수: `src/lib/confesta/toppings.functions.ts`
- `toggleLikeTopping` 입력 스키마에 `liked: boolean` 추가.
- 내부 RPC 호출을 `set_topping_like`로 교체하고 `_liked`를 그대로 전달.
- 반환 형태 `{ liked, likes }` 유지 → 훅 시그니처 변경 불필요.

### 3. 훅: `src/hooks/use-toppings.ts`
- `toggleLikeMut` 입력 타입을 `{ toppingId: string; liked: boolean }`로 변경.
- `mutationFn`: `likeFn({ data: { deviceId, toppingId, liked, opId } })` 호출. `finally { inflightLikes.delete(k) }` 유지.
- `onMutate(vars)`: 스냅샷 저장 후 낙관 업데이트를 **요청된 최종 상태에 정렬**.
  - 규칙 (보강 반영, 핵심):
    ```
    if t.likedByMe === vars.liked: delta = 0                // idempotent 요청 → UI 변경 없음
    else:                          delta = vars.liked ? +1 : -1
    next.likedByMe = vars.liked
    next.likes     = Math.max(0, t.likes + delta)
    ```
  - 이 규칙으로 “이미 좋아요 상태인데 다시 좋아요를 눌러도 0이 되는” 경로가 원천 차단.
- `onSuccess(res, vars)`: 기존대로 `likeGuards`에 2초 TTL로 서버 확정값 등록 + 캐시 patch.
- `onError`: 스냅샷 롤백. `inflightLikes` 정리는 `finally`가 담당.
- `toggleLike` wrap 콜백:
  - 조기 반환: `!sessionId || !deviceId` → 무시, `inflightLikes.has(k)` → 무시, 500ms 쿨다운 이내 → 무시.
  - 현재 캐시의 해당 토핑 `likedByMe`를 읽어 `nextLiked = !likedByMe` 계산.
  - `inflightLikes.add(k)`, `lastLikeAt.set(k, now)` 후 `mutate({ toppingId, liked: nextLiked })`.

### 4. 유지되는 방어선(무변경)
- `likeGuards` 2초 TTL, `applyLikeGuards` 적용 경로.
- `op_id` 기반 realtime dedupe.
- `refetchOnWindowFocus`/`reconnect` 재동기화, 채널 unhealthy→healthy 전이 시 invalidate.
- `togglePin`/`toggleAddressed`/`addTopping`/`deleteOwn`, 댓글, 북마크, 슬라이드, 발표자/관리자 화면 등 모두 무변경.

## 서버비/성능 영향
- 클릭당 RPC 1회로 이전과 동일. Realtime 이벤트도 UPDATE 1 + INSERT/DELETE 1로 동일.
- 500ms 쿨다운 + 인플라이트 가드로 연타 폭주 방지 유지.
- 새 인덱스/트리거 없음.

## 리스크와 대응
- 캐시에 없는 토핑에 `toggleLike` 호출 → 현재 UI 흐름상 없음. 만약 발생하면 wrap에서 조기 반환.
- 네트워크 오류 → `onError` 롤백 + `finally` 인플라이트 해제.
- 여러 탭에서 서로 다른 `liked` 요청 동시 발생 → 서버가 idempotent + 마지막 UPDATE 승자로 수렴, `likeGuards`가 자기 값 보호.

## 검증 절차
1. 청중: 좋아요 클릭 → 1 유지, 새로고침 후에도 하트/숫자 유지.
2. DB: `topping_likes` 행 존재, `toppings.likes`가 실제 행 수와 일치.
3. 청중: 다시 클릭 → 하트 해제, `topping_likes` 삭제, `likes` -1.
4. 청중: 좋아요 상태에서 빠르게 여러 번 클릭 → 최종 상태가 마지막 클릭과 일치, 서버 카운트 일치.
5. 발표자/관리자 화면: realtime 또는 새로고침 후 카운트 일치.
6. 두 브라우저로 동일 토핑에 각각 좋아요 → `likes = 2`, 각자 하트 유지.
