## 목표
엑셀 내보내기에 "질문 댓글"을 포함. 질문 시트에 댓글 수 열을 추가하고, 댓글 원문을 담은 새 시트를 추가.

## 변경 내용

### 1. `src/lib/confesta/export.functions.ts` (전체 내보내기)
- `exportAllToppings`에 `topping_comments` 전량 조회 추가(1000건 단위 페이지네이션, `id, topping_id, session_id, text, role, author_kind, created_at`).
- 반환 payload에 `comments: ExportCommentRow[]` 추가.

### 2. `src/lib/confesta/excel.ts`
- `WorkbookInput`에 `comments?: ExcelComment[]` 추가.
- **시트 1 "질문"**: 맨 끝에 `댓글 수` 열 추가.
- **신규 시트 "댓글"**: 세션 / 카테고리 / 작성일시 / 작성자(청중·발표자) / 역할 / 원 질문 내용 / 댓글 내용.
  - 정렬: 질문 작성순 → 댓글 작성순. 질문 텍스트는 `toppings`에서 id로 매핑.
- `comments`가 비어 있으면 헤더만 있는 시트로 생성(시트 구조 일정 유지).

### 3. `src/components/confesta/SlotToppingsModal.tsx` (세션별 내보내기)
- 다운로드 클릭 시 `listToppingComments({ sessionId })`를 1회 호출해 해당 세션 댓글을 가져와 `downloadToppingsWorkbook`에 전달.
- 이미 있는 `comments.functions.ts`의 서버 함수를 그대로 사용(신규 서버 함수 없음).

### 4. `src/routes/admin.tsx`
- `exportAllToppings` 결과의 `comments`를 그대로 전달만 하면 됨(로직 변경 최소).

## 영향 검토
- 댓글 테이블 규모는 토핑보다 작아 페이로드·비용 영향 미미.
- 기존 시트 구성/열 순서는 유지하고 열·시트만 추가하므로 기존 다운로드 흐름에 회귀 없음.
