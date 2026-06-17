-- session_bookmarks: 발표자가 등록하는 세션별 외부 링크/파일 바로가기
CREATE TABLE public.session_bookmarks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  text NOT NULL,
  title       text NOT NULL,
  url         text,
  file_path   text,
  file_name   text,
  file_size   integer,
  file_mime   text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_bookmarks_title_len CHECK (char_length(title) BETWEEN 1 AND 24),
  CONSTRAINT session_bookmarks_has_target CHECK (url IS NOT NULL OR file_path IS NOT NULL)
);

CREATE INDEX session_bookmarks_session_idx
  ON public.session_bookmarks (session_id, sort_order, created_at);

-- 청중은 비로그인이므로 anon에도 SELECT 허용. 쓰기는 service_role만 (서버 함수 경유 + PIN/슬롯 쿠키 검증).
GRANT SELECT ON public.session_bookmarks TO anon, authenticated;
GRANT ALL ON public.session_bookmarks TO service_role;

ALTER TABLE public.session_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_bookmarks public read"
  ON public.session_bookmarks
  FOR SELECT
  USING (true);
-- 쓰기 정책 없음 → INSERT/UPDATE/DELETE는 service_role(supabaseAdmin)만 가능