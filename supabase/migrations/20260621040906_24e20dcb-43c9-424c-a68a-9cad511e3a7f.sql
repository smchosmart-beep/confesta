
CREATE TYPE public.audience_role AS ENUM ('teacher','specialist','parent','other');

ALTER TABLE public.audience_devices ADD COLUMN role public.audience_role;
ALTER TABLE public.toppings         ADD COLUMN role public.audience_role;

DROP FUNCTION public.list_toppings_with_my_like(text, uuid);

CREATE FUNCTION public.list_toppings_with_my_like(_session_id text, _device_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, session_id text, text text, kind text, prompt_id uuid,
  pinned boolean, addressed boolean, likes integer, created_at timestamptz,
  device_id uuid, role public.audience_role, liked_by_me boolean
)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT
    t.id, t.session_id, t.text, t.kind, t.prompt_id,
    t.pinned, t.addressed, t.likes, t.created_at, t.device_id, t.role,
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
