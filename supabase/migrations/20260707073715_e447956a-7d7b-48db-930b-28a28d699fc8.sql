CREATE OR REPLACE FUNCTION public.count_comments_by_session(_session_id text)
RETURNS TABLE(topping_id uuid, cnt int)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT topping_id, COUNT(*)::int
  FROM public.topping_comments
  WHERE session_id = _session_id
  GROUP BY topping_id;
$$;

GRANT EXECUTE ON FUNCTION public.count_comments_by_session(text)
  TO anon, authenticated, service_role;