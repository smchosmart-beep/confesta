CREATE TABLE public.session_secrets (
  session_id text PRIMARY KEY,
  password_hash text NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now()
);

-- service_role 전용. anon/authenticated 노출 금지(해시 보호).
GRANT ALL ON public.session_secrets TO service_role;

ALTER TABLE public.session_secrets ENABLE ROW LEVEL SECURITY;
-- 정책 없음: service_role만 RLS 우회로 접근, PostgREST(anon/authenticated)는 차단.