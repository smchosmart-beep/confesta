CREATE OR REPLACE FUNCTION public.list_toppings_with_my_like_v2(
  _session_id text,
  _device_id  uuid DEFAULT NULL::uuid,
  _limit      integer DEFAULT 100
) RETURNS TABLE (
  id uuid, session_id text, text text, kind text, prompt_id uuid,
  prompt_text text, pinned boolean, addressed boolean, likes integer,
  created_at timestamp with time zone, device_id uuid, role audience_role,
  op_id uuid, liked_by_me boolean
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH ranked AS (
    SELECT t.*, row_number() OVER (ORDER BY t.created_at DESC) AS rn
    FROM public.toppings t
    WHERE t.session_id = _session_id
  )
  SELECT
    r.id, r.session_id, r.text, r.kind, r.prompt_id,
    p.text AS prompt_text,
    r.pinned, r.addressed, r.likes, r.created_at,
    r.device_id, r.role, r.op_id,
    (_device_id IS NOT NULL AND l.topping_id IS NOT NULL) AS liked_by_me
  FROM ranked r
  LEFT JOIN public.answer_prompts p ON p.id = r.prompt_id
  LEFT JOIN public.topping_likes  l
    ON _device_id IS NOT NULL
   AND l.topping_id = r.id
   AND l.device_id  = _device_id
  WHERE r.kind = 'answer' OR r.pinned OR r.addressed OR r.rn <= _limit
  ORDER BY r.created_at DESC;
$function$;