# 댓글 수가 순간 86으로 튀는 문제 (하이브리드 안)

## 현상
- "댓글 0" 상태에서 댓글 하나 등록 시 순간 "댓글 86"으로 표기, 잠시 후 정상 복귀
- 여러 토핑이 동시에 86으로 표기됨 → counts 캐시 오염 정황
- DB 실측: 어떤 (session, topping) 조합도 카운트 최대 2. 즉 86은 서버 값이 아닌 클라이언트 캐시의 유령 값.

## 원인 (추정)
`src/hooks/use-topping-comments.ts`의 counts 캐시 조작이 3단으로 얽혀 있음:
1. 뮤테이션 `onMutate`에서 낙관적 `+1`
2. 뮤테이션 `onSuccess`에서 `−1`로 되돌림
3. Realtime INSERT에서 다시 `+1`

세 단계 순서가 어긋나거나 Realtime이 재전송/지연되면 카운트가 오염될 여지가 있음. 정확한 유입 경로는 실행 시점의 이벤트 순서에 따라 다르므로, **최종적으로 서버 진실과 반드시 일치**하도록 안전망을 추가하는 방향으로 수정한다.

## 수정 계획 (하이브리드)

파일: `src/hooks/use-topping-comments.ts` 한 개만 수정.

### A. 뮤테이션 로직
- **낙관적 카운트 조정은 유지** (UX상 배지 숫자가 즉시 반영되어야 함)
  - `addComment`: `onMutate`의 counts `+1` 유지
  - `deleteOwnComment` / `deletePresenterComment`: `onMutate`의 counts `−1` 유지
  - 스레드(`comment-thread`) 낙관 삽입/삭제 로직도 그대로 유지
- **onSuccess의 counts 되돌림(`−1`) 로직 제거**
  - 기존에는 Realtime INSERT가 다시 `+1` 할 것을 상쇄하기 위해 뺐지만, 아래 D에서 무조건 invalidate하므로 상쇄가 불필요해짐
- **onError는 기존대로 `prevCounts` 스냅샷으로 롤백** (즉시 UI 정합 유지)
- **onSettled에서 무조건 `qc.invalidateQueries({ queryKey: ["comment-counts", sessionId] })`**
  - 성공/실패/Realtime 순서와 무관하게 최종적으로 서버 실값으로 재수렴
  - 카운트 RPC는 단일 GROUP BY로 저비용이라 뮤테이션 1회당 1회 재조회 부담 없음

### B. Realtime INSERT/DELETE 처리
- **그대로 유지**. 다른 사용자가 단 댓글은 지금처럼 실시간 반영됨.
- 내가 방금 단 댓글이 Realtime으로 도착해 `+1`이 중복 적용되어도, onSettled invalidate가 서버 진실로 덮어쓰므로 결과적으로 안전.

### C. 진단용 임시 로그
- counts를 갱신하는 세 경로(뮤테이션 onMutate, Realtime, bootstrap seed) 각각에서 **이전값 → 새값 차이가 2 이상**이면 `console.warn`으로 다음을 남김:
  - `source`, `toppingId`, `prev`, `next`, `event`(INSERT/DELETE 등)
- 재현 시 로그로 86의 유입 지점을 확정한 뒤 로그 제거 (후속 조치).

### D. 세션-bootstrap 관련
- `src/hooks/use-session-bootstrap.ts`의 seed 로직은 `getQueryData(key) == null`일 때만 동작하므로 그대로 두어도 hybrid 흐름과 충돌 없음. 변경 없음.

## 기대 효과
- **UX**: 낙관 업데이트 유지 → 배지 숫자가 여전히 즉시 반영됨.
- **정합성**: 뮤테이션 후 반드시 재조회 → 낙관값이 잘못돼도 수백 ms 내 서버 진실로 복구, "86" 같은 유령 값이 화면에 남지 않음.
- **다른 기능 영향 없음**: 변경 대상 쿼리 키는 `comment-counts`만. toppings/prompts/gate/thread/likes/bookmarks 등에는 영향 없음.
- **서버 비용**: 뮤테이션당 카운트 RPC 1회 추가(경량). Realtime 트래픽·다른 RPC에는 변화 없음.

## 변경 범위
- `src/hooks/use-topping-comments.ts` 1개 파일만 수정
- 서버 함수/DB 스키마/Realtime 채널 구조 변경 없음
