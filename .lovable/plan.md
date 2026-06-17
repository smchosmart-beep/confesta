## 발표자 세션 바로가기(북마크) — 링크 + 파일 업로드 (최종판)

발표자가 세션별로 외부 링크 또는 파일(PPT/HWP/PDF 등)을 등록하고, 청중 토핑 추가 탭의 "토핑 보내기" 카드 위에 카드로 노출. 한 북마크에 링크와 파일을 동시에 가질 수 있으며, 청중 카드에서는 **링크 열기** / **파일 다운로드** 버튼이 분리되어 표시.

### 1. DB 마이그레이션 — `session_bookmarks`

```text
session_bookmarks
  id            uuid PK
  session_id    text NOT NULL
  title         text NOT NULL          -- 1~24자
  url           text                   -- nullable, http(s)://...
  file_path     text                   -- nullable, storage 객체 경로
  file_name     text                   -- nullable, 원본 파일명
  file_size     int                    -- nullable, bytes
  file_mime     text                   -- nullable
  sort_order    int  NOT NULL DEFAULT 0
  created_at    timestamptz NOT NULL DEFAULT now()
INDEX (session_id, sort_order, created_at)
CHECK: url IS NOT NULL OR file_path IS NOT NULL
```

권한 / RLS:
- `GRANT SELECT TO anon, authenticated`, `GRANT ALL TO service_role`
- RLS 활성화, SELECT 정책 `USING (true)`. 쓰기 정책 없음 → `supabaseAdmin`만 가능.
- Realtime publication 추가 안 함.

### 2. Storage 버킷 — `session-bookmarks` (private)

- **private 버킷** (`storage_create_bucket(public:false)`).
- 청중 다운로드는 단기 **서명 URL** (`createSignedUrl(path, 1800, { download: fileName })`, 30분 만료, `Content-Disposition: attachment; filename=...` 자동 부여).
- 객체 키는 서버 결정: `{sessionId}/{uuid}-{sanitized fileName}`.
- 허용 확장자: `.pdf .ppt .pptx .hwp .hwpx .doc .docx .xls .xlsx .zip .png .jpg .jpeg`
- 허용 MIME (참고용 — `octet-stream`은 **제외**):
  - `application/pdf`
  - `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`
  - `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/x-hwp`, `application/haansofthwp`, `application/vnd.hancom.hwp`, `application/haansofthwpx`, `application/vnd.hancom.hwpx`
  - `application/zip`, `image/png`, `image/jpeg`
- **통과 조건: 확장자가 화이트리스트에 있고 동시에 (MIME 화이트리스트 OR MIME 빈/누락)** — 임의 .exe는 확장자에서 차단, .hwp의 알 수 없는 MIME은 확장자로 허용.
- 최대 파일 크기: **20 MB** (서버 강제).

### 3. 서버 함수 — `src/lib/confesta/bookmarks.functions.ts` (신규)

모든 함수가 `supabaseAdmin`을 `.handler()` 안에서 동적 import.

- **`listBookmarks({ sessionId })`** — 공개. 파일이 있는 항목은 서명 다운로드 URL 동봉.
  - **60초 in-memory 캐시** (모듈 스코프 `Map<sessionId, { at, data }>`): DB·storage API 호출 절감 + DoS 완화. Worker 인스턴스 단위이지만 충분히 효과 있음.

- **`requestBookmarkUpload({ sessionId, fileName, fileMime, fileSize })`**:
  - `assertPresenterSlot(sessionId)`
  - 세션당 8개 상한 사전 체크.
  - 위 (확장자 + MIME) 조건, `fileSize ≤ 20 MB`, `fileName` sanitize(`/ \ NUL ..` 제거, 120자 cap).
  - 서버가 path 결정: `${sessionId}/${crypto.randomUUID()}-${safeName}`.
  - `createSignedUploadUrl(path)` 호출, **실패 시 path 재생성 1회 retry**(충돌 방어).
  - 반환: `{ uploadUrl, token, filePath, fileName: safeName }`.

- **`createBookmark({ sessionId, title, url?, filePath?, fileName?, fileSize?, fileMime? })`**:
  - `assertPresenterSlot(sessionId)`
  - Zod: title trim 1~24자 / url 없거나 `^https?://` + 500자 / 파일 필드 전부 함께 / **url과 filePath 중 최소 하나** / 위 화이트리스트 / size ≤ 20 MB.
  - `filePath`는 `sessionId/` 접두사 검증 + `getMetadata`로 실제 객체 존재 확인(위조 방지).
  - 세션당 8개 상한 재확인, `sort_order = max+1`.
  - 성공 시 해당 세션의 in-memory 캐시 invalidate.

- **`deleteBookmarkUpload({ sessionId, filePath })`** — 다이얼로그 취소/실패 시 orphan 정리:
  - `assertPresenterSlot(sessionId)`. `filePath`가 `sessionId/` 접두사인지 검증 후 storage에서만 삭제.

- **`deleteBookmark({ id })`** — 행 조회 → `assertPresenterSlot(sessionId)` → 파일 있으면 storage 객체 제거 후 행 삭제. 캐시 invalidate.

### 4. 업로드 흐름 (Worker 미경유)

1. 파일 선택 → 클라이언트 1차 검증(확장자·MIME·size).
2. `requestBookmarkUpload(...)` → `{ uploadUrl, token, filePath, fileName }` 수신.
3. 브라우저가 `supabase.storage.from('session-bookmarks').uploadToSignedUrl(filePath, token, file)`로 직접 PUT. SDK `onUploadProgress`(혹은 XHR fallback)로 진행률 표시.
4. 성공 시 `createBookmark({ ..., filePath, fileName, fileSize, fileMime })`.
5. 다이얼로그 닫기/실패/abort 시 → `deleteBookmarkUpload({ sessionId, filePath })`.

### 5. 발표자 화면 — `src/routes/presenter.tsx`

`RoleHeader.right`를 세로 스택으로:
```tsx
<div className="flex flex-col gap-2 items-end w-full sm:w-auto">
  <BookmarkBar sessionId={sessionId} />
  <SlotPickerBar ... />
</div>
```

`BookmarkBar`:
- `useQuery(['bookmarks', sessionId])`, `staleTime: 5 * 60_000`. Realtime 없음. mutation 후 invalidate.
- 칩 가로 나열(`flex-wrap`), `🔗`/`📎` 아이콘.
- hover X → 확인 후 `deleteBookmark`.
- 끝에 점선 `+ 바로가기` 버튼 → shadcn `Dialog`.

`Dialog`(추가 폼):
- 제목 입력(1~24자 카운터)
- 링크 입력(선택, `https://…`)
- 파일 선택(선택, `accept=".pdf,.ppt,.pptx,.hwp,.hwpx,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg"`), 진행률 바.
- 확인: 링크·파일 둘 다 비면 비활성. 파일 있으면 (1)`requestBookmarkUpload` → (2)`uploadToSignedUrl` → (3)`createBookmark`. 실패 시 이전 단계 파일 정리.
- 업로드 중 다이얼로그 닫기 시도 → **shadcn `AlertDialog`** 로 "업로드를 취소하시겠습니까?" 확인 → abort + `deleteBookmarkUpload`. (브라우저 `confirm()` 미사용 — 모바일 UX 일관성.)

### 6. 청중 화면 — `src/routes/audience.tsx`

"토핑 보내기" 카드 바로 위에 `<AudienceBookmarkStrip sessionId={activeSessionId} />`.

- `useQuery(['bookmarks', sessionId])`, **`staleTime: 5 * 60_000`** (서명 URL 만료 30분 vs 캐시 5분 = 안전 마진 25분), `refetchOnWindowFocus: true`. Realtime 없음.
- 결과 0개면 `null`.
- 카드 컨테이너: `rounded-3xl bg-card/70 border border-white/60 shadow-cream p-4`, 라벨 "바로가기".
- 각 항목 한 줄:
  - 좌측: 아이콘 + 제목, 파일이면 아래 회색 글씨로 파일명·크기.
  - 우측 버튼 그룹(둘 다/한쪽):
    - **🔗 링크 열기** — `<a href={url} target="_blank" rel="noopener noreferrer">`
    - **⬇ 파일 다운로드** — `<a href={fileUrl} target="_blank" rel="noopener noreferrer">` (서명 URL 헤더가 attachment 강제)
- 모바일 시 버튼 줄바꿈.

### 7. 디자인 토큰

- 카드/칩: `bg-card`, `shadow-cream`, `bg-grad-aurora-soft` 등 기존 토큰.
- 링크 버튼: `bg-grad-blueberry text-white`, 파일 버튼: `bg-grad-strawberry text-white` (주문/수령 QR 색감과 통일).
- 발표자 추가 버튼: `border-dashed border-white/80 text-muted-foreground`.
- 다이얼로그: `SlotToppingsModal`과 동일 shadcn 베이스.

### 보안 체크리스트
- ✅ URL `^https?://`만 허용, 500자 제한
- ✅ 확장자 화이트리스트 + MIME(빈 값 허용) 이중 검증, **octet-stream 제외**, 20 MB 상한
- ✅ Path 서버 결정(UUID), `sessionId/` 접두사 검증, `getMetadata` 존재 확인
- ✅ 모든 쓰기는 PIN/슬롯 쿠키 통과 시에만 (RLS 쓰기 정책 없음)
- ✅ private 버킷 + 30분 서명 URL(다운로드)
- ✅ 외부 링크 `noopener noreferrer`
- ✅ 세션당 8개 상한
- ✅ orphan 파일 정리(다이얼로그 abort 시 + `createSignedUploadUrl` retry)

### 비용 영향
- Realtime 채널 0개.
- Storage 업로드 Worker 미경유.
- `listBookmarks`에 **60초 in-memory 캐시** → 대규모 청중(1000명+)에서도 storage API 부하 안정.
- 청중 측 React Query 5분 캐시 + 포커스 시 refetch.

### 기존 기능 영향
- 기존 토핑/슬롯/게이트/슬라이드 미수정.
- 변경 지점: `RoleHeader.right` 레이아웃, audience 토핑 보내기 카드 위 한 자리.

### 범위 제한
- 정렬 변경(드래그) 없음 — 생성 순.
- 편집 없음 — 삭제 후 재생성.
- 파일 교체는 삭제 후 재등록.
- 장기 orphan(24시간+) 자동 청소는 이번 범위 밖.
