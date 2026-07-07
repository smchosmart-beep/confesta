## 원인

`src/routes/presenter.tsx` 202줄에서 `BookmarkBar`가 `RoleHeader` 우측에 `selected`만 있으면 렌더링됨 — PIN 잠금 해제 여부(`SelectedSlotBody`의 `checkQuery.data?.ok`)와 무관.

서버 함수(`requestBookmarkUpload` / `createBookmark` / `deleteBookmark` / `deleteBookmarkUpload`)는 모두 `assertPresenterSlot` 쿠키 검증이 있어서 **실제 쓰기는 401로 차단**되지만, UI에는 "자료 추가" 버튼과 기존 자료 칩(+ 삭제 X 버튼)이 그대로 노출되어 마치 인증 없이 되는 것처럼 보임. 또한 `listBookmarks`는 게이트가 없어 미인증 상태에서도 목록 fetch가 발생.

## 수정

`BookmarkBar`를 PIN 잠금 해제된 슬롯에서만 표시.

**변경 파일: `src/components/confesta/BookmarkBar.tsx` 한 개**

- 컴포넌트 초입에서 `useQuery({ queryKey: ["presenter-slot-auth", sessionId], enabled: false })`로 **캐시만 구독**(별도 fetch 트리거 없음, `SelectedSlotBody`가 이미 같은 key로 채움).
- `data?.ok !== true`면 `return null` — 목록 fetch도, 자료 추가 버튼도, 칩도 렌더링하지 않음.
- `sessionId`가 null이면 기존대로 null(변경 없음).

## 부작용 검토

- **청중 화면(`AudienceBookmarkStrip`)**: 별도 컴포넌트라 영향 없음. 청중은 세션 게이트 통과 후 그대로 자료 열람 가능.
- **서버비**: 오히려 감소. 미인증 상태의 `listBookmarks` 호출이 사라짐. 인증 후에는 기존과 동일(60초 in-memory 캐시 + staleTime 5분).
- **중복 요청 없음**: `presenter-slot-auth` 쿼리는 `SelectedSlotBody`가 이미 소유. `enabled:false`로 캐시만 읽으므로 dedupe.
- **잠금 재잠금(`onLock`)**: `checkQuery` 무효화되면 `ok=false` → BookmarkBar 자동으로 사라짐. 열려있던 다이얼로그가 있어도 부모 unmount로 정리됨.
- **다른 라우트/기능**: `BookmarkBar`는 `presenter.tsx`에서만 사용(grep 확인). 무관.
- **보안 관점**: 서버는 이미 안전하므로 이번 변경은 UX 정합성 개선. listBookmarks 정보 노출 소량 완화 부가 효과.

## 대안(비채택)

`presenter.tsx`에서 인증 상태를 상위로 끌어올려 조건부로 `<BookmarkBar/>` 렌더 — 구조 변경이 크고, `SelectedSlotBody` 내부 상태 승격이 필요. 컴포넌트 자체 게이트가 최소 변경.
