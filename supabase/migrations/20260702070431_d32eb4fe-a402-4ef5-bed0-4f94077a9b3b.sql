-- ── 1. 성능 인덱스 3개 추가 + 중복 인덱스 2개 제거 ────────────────
CREATE INDEX IF NOT EXISTS toppings_session_created_idx
  ON public.toppings (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS topping_likes_device_topping_idx
  ON public.topping_likes (device_id, topping_id);

CREATE INDEX IF NOT EXISTS topping_comments_session_created_idx
  ON public.topping_comments (session_id, created_at);

DROP INDEX IF EXISTS public.toppings_session_id_idx;
DROP INDEX IF EXISTS public.topping_comments_session_idx;

-- ── 2. op_id 컬럼 추가 (실시간 이벤트 dedupe용) ─────────────────────
ALTER TABLE public.toppings         ADD COLUMN IF NOT EXISTS op_id UUID;
ALTER TABLE public.topping_comments ADD COLUMN IF NOT EXISTS op_id UUID;

-- ── 3. toggle_topping_like 오버로드 (op_id 인자 포함) ──────────────
-- 기존 2인자 함수는 유지, 3인자 오버로드만 추가
CREATE OR REPLACE FUNCTION public.toggle_topping_like(
  _topping_id uuid,
  _device_id  uuid,
  _op_id      uuid
)
RETURNS TABLE(liked boolean, likes integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_inserted int;
  v_deleted  int;
  v_likes    int;
BEGIN
  INSERT INTO public.topping_likes (topping_id, device_id)
  VALUES (_topping_id, _device_id)
  ON CONFLICT (topping_id, device_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 1 THEN
    UPDATE public.toppings
    SET likes = COALESCE(likes, 0) + 1,
        op_id = _op_id
    WHERE id = _topping_id
    RETURNING likes INTO v_likes;
    RETURN QUERY SELECT true, COALESCE(v_likes, 0);
  ELSE
    DELETE FROM public.topping_likes
    WHERE topping_id = _topping_id AND device_id = _device_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted = 1 THEN
      UPDATE public.toppings
      SET likes = GREATEST(COALESCE(likes, 0) - 1, 0),
          op_id = _op_id
      WHERE id = _topping_id
      RETURNING likes INTO v_likes;
      RETURN QUERY SELECT false, COALESCE(v_likes, 0);
    ELSE
      SELECT t.likes INTO v_likes
      FROM public.toppings t
      WHERE t.id = _topping_id;
      RETURN QUERY SELECT false, COALESCE(v_likes, 0);
    END IF;
  END IF;
END;
$$;

-- ── 4. list_toppings_with_my_like_v2 신설 ───────────────────────────
-- JOIN으로 prompt_text 흡수, pinned/addressed는 무조건 포함, 나머지는 최신 100건
CREATE OR REPLACE FUNCTION public.list_toppings_with_my_like_v2(
  _session_id text,
  _device_id  uuid DEFAULT NULL,
  _limit      int  DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  session_id text,
  text text,
  kind text,
  prompt_id uuid,
  prompt_text text,
  pinned boolean,
  addressed boolean,
  likes integer,
  created_at timestamptz,
  device_id uuid,
  role audience_role,
  op_id uuid,
  liked_by_me boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      t.*,
      row_number() OVER (ORDER BY t.created_at DESC) AS rn
    FROM public.toppings t
    WHERE t.session_id = _session_id
  )
  SELECT
    r.id, r.session_id, r.text, r.kind, r.prompt_id,
    p.text AS prompt_text,
    r.pinned, r.addressed, r.likes, r.created_at,
    r.device_id, r.role, r.op_id,
    CASE
      WHEN _device_id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.topping_likes l
        WHERE l.topping_id = r.id AND l.device_id = _device_id
      )
    END AS liked_by_me
  FROM ranked r
  LEFT JOIN public.answer_prompts p ON p.id = r.prompt_id
  WHERE r.pinned OR r.addressed OR r.rn <= _limit
  ORDER BY r.created_at DESC;
$$;

-- ── 5. 관리자 전용 무제한 토핑 조회 함수 ────────────────────────────
CREATE OR REPLACE FUNCTION public.list_all_toppings_admin(_session_id text)
RETURNS TABLE(
  id uuid,
  session_id text,
  text text,
  kind text,
  prompt_id uuid,
  prompt_text text,
  pinned boolean,
  addressed boolean,
  likes integer,
  created_at timestamptz,
  device_id uuid,
  role audience_role,
  op_id uuid
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    t.id, t.session_id, t.text, t.kind, t.prompt_id,
    p.text AS prompt_text,
    t.pinned, t.addressed, t.likes, t.created_at,
    t.device_id, t.role, t.op_id
  FROM public.toppings t
  LEFT JOIN public.answer_prompts p ON p.id = t.prompt_id
  WHERE t.session_id = _session_id
  ORDER BY t.created_at DESC;
$$;