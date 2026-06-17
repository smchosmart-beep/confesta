## 문제

청중이 "파일 다운로드"를 누르면 저장된 파일명이 원본(예: `클래스1234 매뉴얼.pdf`)이 아니라 스토리지 객체 키(UUID.pdf)로 저장됨.

원인: 현재 다운로드 링크는 Supabase Storage의 서명 URL을 그대로 사용함. 서명 URL 경로 자체가 `uuid.pdf`라서, 한글 파일명을 `createSignedUrl(..., { download })`로 넘겨도 일부 브라우저/환경에서 `Content-Disposition`의 `filename*=UTF-8''...` 인코딩이 누락되거나 무시되어 URL 경로의 UUID 파일명으로 저장됨.

## 해결 방향

청중 다운로드 링크를 우리 서버 라우트를 거치게 해서, 서버가 직접 한글 파일명을 RFC 5987 방식으로 인코딩한 `Content-Disposition` 헤더와 함께 파일 바디를 스트리밍한다.

## 변경 사항

### 1) 새 서버 라우트 `src/routes/api/public/bookmark-download.$id.ts`
- `GET /api/public/bookmark-download/:id`
- 핸들러 안에서 `supabaseAdmin`을 동적 import
- `session_bookmarks` 행 조회 → `file_path`, `file_name`, `file_mime` 확보
- 파일이 없으면 404, 링크-only 북마크면 400
- `supabaseAdmin.storage.from("session-bookmarks").download(file_path)`로 Blob 받아 그대로 응답
- 헤더:
  - `Content-Type`: 저장된 `file_mime` 또는 `application/octet-stream`
  - `Content-Disposition: attachment; filename="<ASCII fallback>"; filename*=UTF-8''<percent-encoded original>`
  - `Cache-Control: private, max-age=0, no-store`

### 2) `src/lib/confesta/bookmarks.functions.ts` — `listBookmarks`
- 각 항목의 `fileUrl`을 서명 URL 대신 `"/api/public/bookmark-download/" + id`로 설정
- `createSignedUrl` 호출 제거(불필요한 지연/요청 절감)
- DTO 형태/필드 그대로 유지 → 청중 컴포넌트는 무변경

### 3) (변경 없음) `AudienceBookmarkStrip.tsx`, `BookmarkBar.tsx`
- `fileUrl`을 그대로 `<a href>`에 쓰기만 하므로 추가 수정 불필요

## 검증

- 한글 파일명(예: `클래스1234 매뉴얼.pdf`)으로 등록된 북마크를 청중 화면에서 다운로드 → 원본 한글 파일명으로 저장되는지 확인
- 링크-only / 파일-only / 링크+파일 3종 모두 정상 렌더 및 동작 확인
- 다른 세션 ID로 직접 URL 호출 시에도 행 조회는 id 기반이라 동작하지만, 응답 데이터는 파일 자체이므로 정보 노출 위험 없음(기존 서명 URL과 동일한 공개 수준)

## 영향 범위

- 발표자 업로드/등록 로직, DB 스키마, RLS, 스토리지 정책 변경 없음
- 청중 다운로드 경로만 서명 URL → 자체 프록시 라우트로 교체
