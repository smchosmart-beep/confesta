# 댓글 수가 순간 86으로 튀는 문제 (하이브리드 안 v2)

## 현상
- "댓글 0" 상태에서 신규 댓글 1건 등록 시 순간 "댓글 86"으로 표기, 잠시 후 정상 복귀
- 여러 토핑이 동시에 86으로 표기됨 → counts 캐시 오염
- DB 실측: 어떤 (session, topping) 조합도 카운트 최대 2. 86은 서버값이 아닌 클라이언트 캐시의 유령값.

## 원인 (가설 우선순위)

### 가설 A — 리스너 중복 가산 (유력)
- `useToppingCommentCounts(sessionId)`가 **질문 카드마다** 마운트되고, 매 마운트가 `subscribeToppingComments`로 자체 realtime 리스너를 등록.
- INSERT 1건에 `qc.setQueryData(cur + 1)`이 **카드 수(N)만큼 반복** → INSERT 1건에 +N 가산.
- 발표자 화면 카드 수와 관측값(예: 카드 18 × 실제 신규 5 ≈ 90) 스케일이 대략 일치.

### 가설 B — 뮤테이션·Realtime 3단 상쇄 어긋남 (기여 가능)
`use-topping-comments.ts`의 3경로가 얽힘:
1. 뮤테이션 `onMutate` 낙관 `+1`
2. 뮤테이션 `onSuccess`에서 `−1` (Realtime `+1`을 상쇄하려는 의도)
3. Realtime INSERT `+1`

Realtime 재전송/지연 시 상쇄가 어긋나면 오염 가능.

두 가설 모두 이번 안전망(onSettled invalidate)으로 **화면상 유령값은 해소**됨. 근본 원인 확정은 로그로 후속 진행.

## 수정 계획 (하이브리드)

파일: `src/hooks/use-topping-comments.ts` 한 개만 수정.

### A. 뮤테이션 로직
- **낙관적 카운트 조정은 유지** (배지 즉시 반영)
  - `addComment.onMutate`: counts `+1` 유지
  - `deleteOwnComment`/`deletePresenterComment.onMutate`: counts `−1` 유지
  - 스레드(`comment-thread`) 낙관 삽입/삭제 로직도 그대로 유지
- **`onSuccess`의 counts 되돌림(`−1`) 로직 제거**
  - 아래 D의 무조건 invalidate로 최종 정합이 보장되므로 상쇄 불필요
- **`onError`는 기존대로 `prevCounts` 스냅샷으로 롤백**
- **`onSettled`에서 무조건 `qc.invalidateQueries({ queryKey: ["comment-counts", sessionId] })`**
  - 성공/실패/Realtime 순서와 무관하게 서버 실값으로 재수렴
  - 카운트 RPC는 세션 단위 단일 GROUP BY로 저비용

### B. Realtime INSERT/DELETE 처리
- 그대로 유지. 다른 사용자 댓글은 지금처럼 실시간 반영.
- 저자 본인 댓글이 Realtime으로 도착해 `+1`이 중복 적용되어도 `onSettled` invalidate가 서버 진실로 덮어쓰므로 안전.

### C. 진단용 임시 로그
- 기존 `warnCountJump`(source 라벨 포함) 유지. counts 갱신 세 경로에서 이전값→새값 차이 2 이상이면 `console.warn`.
- **배포 후 최소 1회 재현 로그를 확보해 근본 원인(가설 A/B)을 확정**한 뒤 로그 제거.

### D. 세션-bootstrap
- `use-session-bootstrap.ts`의 seed는 `getQueryData(key) == null`일 때만 동작 → 이번 흐름과 충돌 없음. 변경 없음.

## 예상 동작 (알아둘 점)
- **저자 본인 화면에서 잠깐 "실값 +1"로 튄 뒤 수백 ms 내 수렴**할 수 있음.
  순서: `onMutate +1` → Realtime INSERT `+1` → `onSettled invalidate` → 서버 실값.
  기존 `onSuccess −1`은 이 순간 상쇄를 노린 코드였음. 이번 안에서는 수용 가능한 트레이드오프(유령값 86 제거가 우선).
- 다른 사용자 화면에서는 낙관 단계가 없으므로 이 깜빡임 없음.

## 후속 조치 (별건 이슈로 등록)
- **카운트 realtime 리스너를 세션당 1회로 축소하는 리팩터.**
  - 방향: 리스너 등록/해제를 모듈 레벨 스토어에 위임(세션당 refCount 관리), 훅은 `getCount` 셀렉터만 노출.
  - 근본 원인이 가설 A였다면 이 리팩터가 궁극 해결책. 이번 배포의 로그로 확정 후 진행.

## 부작용 검토 요약
- **UX**: 배지 즉시 반영 유지. 저자 본인만 잠깐 +1 오버슈트 후 수렴.
- **정합성**: onSettled invalidate로 항상 서버 진실로 복구. "86" 유령값 사라짐.
- **다른 기능**: 변경 쿼리 키는 `comment-counts` 하나. toppings/likes/prompts/gate/thread/bookmarks/slots 등 무영향.
- **서버비**: 뮤테이션 1회당 카운트 RPC 1회 추가(경량, 인덱스 전제). Realtime/DB 쓰기 변화 없음.
  - 규모 감각: 100명 × 10회 = 1,000회/세션 추가 — 무시 가능.

## 변경 범위
- `src/hooks/use-topping-comments.ts` 1개 파일만 수정
- 서버 함수/DB 스키마/Realtime 채널 구조 변경 없음
