
-- 1) Drop duplicate indexes (same columns indexed twice)
DROP INDEX IF EXISTS public.toppings_session_idx;
DROP INDEX IF EXISTS public.scoops_session_idx;
DROP INDEX IF EXISTS public.answer_prompts_session_idx;
DROP INDEX IF EXISTS public.topping_gates_session_id_idx;

-- 2) One-time reconciliation: ensure toppings.likes matches actual rows
UPDATE public.toppings t
SET likes = sub.c
FROM (
  SELECT topping_id, count(*)::int AS c
  FROM public.topping_likes
  GROUP BY topping_id
) sub
WHERE sub.topping_id = t.id AND t.likes IS DISTINCT FROM sub.c;

UPDATE public.toppings
SET likes = 0
WHERE likes <> 0
  AND id NOT IN (SELECT DISTINCT topping_id FROM public.topping_likes);

-- 3) Atomic like toggle: INSERT or DELETE + ±1 on toppings.likes in one txn
CREATE OR REPLACE FUNCTION public.toggle_topping_like(
  _topping_id uuid,
  _device_id uuid
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
  -- Try insert; trigger fills session_id from toppings
  INSERT INTO public.topping_likes (topping_id, device_id)
  VALUES (_topping_id, _device_id)
  ON CONFLICT (topping_id, device_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 1 THEN
    UPDATE public.toppings
    SET likes = COALESCE(likes, 0) + 1
    WHERE id = _topping_id
    RETURNING likes INTO v_likes;
    RETURN QUERY SELECT true, COALESCE(v_likes, 0);
  ELSE
    DELETE FROM public.topping_likes
    WHERE topping_id = _topping_id AND device_id = _device_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted = 1 THEN
      UPDATE public.toppings
      SET likes = GREATEST(COALESCE(likes, 0) - 1, 0)
      WHERE id = _topping_id
      RETURNING likes INTO v_likes;
      RETURN QUERY SELECT false, COALESCE(v_likes, 0);
    ELSE
      -- Race: someone else flipped between our INSERT attempt and DELETE
      SELECT t.likes INTO v_likes FROM public.toppings t WHERE t.id = _topping_id;
      RETURN QUERY SELECT false, COALESCE(v_likes, 0);
    END IF;
  END IF;
END;
$$;

-- 4) Single-query toppings list with "liked by me" flag
CREATE OR REPLACE FUNCTION public.list_toppings_with_my_like(
  _session_id text,
  _device_id  uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  session_id text,
  text text,
  kind text,
  prompt_id uuid,
  pinned boolean,
  addressed boolean,
  likes integer,
  created_at timestamptz,
  device_id uuid,
  liked_by_me boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    t.id, t.session_id, t.text, t.kind, t.prompt_id,
    t.pinned, t.addressed, t.likes, t.created_at, t.device_id,
    CASE
      WHEN _device_id IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM public.topping_likes l
        WHERE l.topping_id = t.id AND l.device_id = _device_id
      )
    END AS liked_by_me
  FROM public.toppings t
  WHERE t.session_id = _session_id
  ORDER BY t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_topping_like(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_toppings_with_my_like(text, uuid) TO service_role;
