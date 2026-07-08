## 목표
청중이 좋아요를 누르면 화면의 1 표시가 서버 저장값과 일치하게 유지되고, 새로고침 후에도 `likedByMe`와 좋아요 수가 보존되도록 수정합니다.

## 원인 가설
현재 구현은 `onMutate`와 `mutationFn` 사이에 `skippedLikeIds` 전역 Set으로 “스킵 신호”를 주고받습니다. 이 방식은 빠른 재탭이나 잔여 마킹이 있을 때 서버 응답·낙관 업데이트·onSuccess 컨텍스트가 어긋날 수 있고, 그 결과 낙관값 1이 실시간/재조회로 0으로 덮이는 흐름이 생길 수 있습니다.

## 수정 계획
`src/hooks/use-toppings.ts` 한 파일만 수정합니다. 서버 함수·RPC·스키마·RLS·실시간 채널 무변경.

1. **좋아요 뮤테이션 단순화**
   - `skippedLikeIds` Set을 제거합니다.
   - `mutationFn`은 호출된 경우 항상 서버 RPC 1회만 실행하고 `finally`에서 `inflightLikes.delete(key)`를 보장합니다.
   - `onMutate`는 스킵 판단을 하지 않고, 항상 스냅샷 저장 + 낙관 업데이트만 수행합니다.

2. **스킵/쿨다운 판단을 외부 콜백으로 이동**
   - `useSessionToppings`가 노출하는 `toggleLike`를 얇은 wrap 함수로 바꿉니다.
   - wrap 함수에서 다음 순서로 조기 반환합니다.
     - `deviceId` 또는 `sessionId`가 없으면 무시.
     - 같은 토핑이 `inflightLikes`에 있으면 무시.
     - 500ms 이내 재탭이면 무시.
   - 통과한 클릭만 `inflightLikes.add(key)` + `lastLikeAt.set(key, now)` 후 `mutate` 호출.
   - 이렇게 하면 “스킵된 mutation”이 아예 만들어지지 않아 컨텍스트 불일치가 사라집니다.

3. **서버 응답 방어**
   - `onSuccess`에서 응답값을 캐시에 patch하고 `likeGuards`에 2초 TTL로 등록하는 기존 로직 유지.
   - `onError`는 스냅샷 롤백 + 실패 토스트. 인플라이트 정리는 `mutationFn`의 `finally`가 담당.

4. **useQuery `enabled` 조건은 변경하지 않음**
   - 첫 렌더에서 목록이 잠깐 사라지는 부작용을 피하기 위해 현행 `enabled: !!sessionId` 유지.
   - `deviceId` 가드는 2번의 wrap 콜백 안에서만 처리합니다.

## 영향 검토
- **서버비**: 정상 클릭당 RPC 1회. 인플라이트·쿨다운 유지로 연타 폭주 방지. 실시간 이벤트도 UPDATE 1 + INSERT/DELETE 1로 원래 설계 그대로.
- **실시간 정합성**: `likeGuards`(2초 TTL)와 `op_id` dedupe 그대로. 자기 낙관값이 realtime로 되돌려지는 race 방어 유지.
- **발표자/관리자 화면**: `toppings.likes` UPDATE → realtime patch 경로 무변경.
- **다른 기능**: `togglePin`/`toggleAddressed`/`addTopping`/`deleteOwn`, 댓글, 북마크, 슬라이드, 스태프, 관리자 모두 무관.
- **엣지 케이스**:
  - 네트워크 오류 → `onError` 롤백 + `finally` 정리.
  - `deviceId` 준비 전 클릭 → wrap에서 무시(서버 호출·화면 변경 없음).
  - 서로 다른 토핑 연속 클릭 → 키가 달라 간섭 없음.

## 검증
1. 청중 화면에서 좋아요 클릭 후 1이 0으로 되돌아가지 않는지 확인.
2. DB에서 `topping_likes` 행 추가 + `toppings.likes` +1 확인.
3. 새로고침 후 하트 상태·숫자 유지 확인.
4. 발표자 화면에서 실시간 또는 새로고침 후 반영 확인.
5. 빠른 연타 시 RPC 중복 호출로 0으로 되돌아가지 않는지 확인.
6. 두 번째 클릭으로 좋아요 취소 → DELETE + `likes` -1 확인.