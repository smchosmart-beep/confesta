CREATE OR REPLACE FUNCTION public.get_slot_aggregates(_day int, _period text)
RETURNS TABLE(session_id text, orders int, pickups int, toppings int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH prefix AS (SELECT (_day::text || '|' || _period || '|') AS p),
  o AS (
    SELECT o.session_id,
           COUNT(*)::int AS orders,
           COUNT(*) FILTER (WHERE o.picked_up_at IS NOT NULL)::int AS pickups
    FROM public.orders o, prefix
    WHERE o.session_id LIKE prefix.p || '%'
    GROUP BY o.session_id
  ),
  t AS (
    SELECT t.session_id, COUNT(*)::int AS toppings
    FROM public.toppings t, prefix
    WHERE t.session_id LIKE prefix.p || '%'
    GROUP BY t.session_id
  )
  SELECT COALESCE(o.session_id, t.session_id) AS session_id,
         COALESCE(o.orders, 0) AS orders,
         COALESCE(o.pickups, 0) AS pickups,
         COALESCE(t.toppings, 0) AS toppings
  FROM o FULL OUTER JOIN t ON o.session_id = t.session_id;
$$;

REVOKE ALL ON FUNCTION public.get_slot_aggregates(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_slot_aggregates(int, text) TO authenticated, service_role;