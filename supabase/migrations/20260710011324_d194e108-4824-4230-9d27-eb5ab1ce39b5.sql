
-- 1) v2: 질문 전용 전량 반환. _limit 인자 시그니처는 유지하되 무시.
CREATE OR REPLACE FUNCTION public.list_toppings_with_my_like_v2(
  _session_id text,
  _device_id uuid DEFAULT NULL::uuid,
  _limit integer DEFAULT 100
)
RETURNS TABLE(
  id uuid, session_id text, text text, kind text, prompt_id uuid,
  prompt_text text, pinned boolean, addressed boolean, likes integer,
  created_at timestamp with time zone, device_id uuid, role audience_role,
  op_id uuid, liked_by_me boolean
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    t.id, t.session_id, t.text, t.kind, t.prompt_id,
    p.text AS prompt_text,
    t.pinned, t.addressed, t.likes, t.created_at,
    t.device_id, t.role, t.op_id,
    (_device_id IS NOT NULL AND l.topping_id IS NOT NULL) AS liked_by_me
  FROM public.toppings t
  LEFT JOIN public.answer_prompts p ON p.id = t.prompt_id
  LEFT JOIN public.topping_likes  l
    ON _device_id IS NOT NULL
   AND l.topping_id = t.id
   AND l.device_id  = _device_id
  WHERE t.session_id = _session_id
    AND t.kind = 'question'
  ORDER BY t.created_at DESC;
$function$;

-- 2) 발표자 전용: 질문+응답 전량 반환. SECURITY DEFINER로 service_role 경유.
CREATE OR REPLACE FUNCTION public.list_toppings_for_presenter(
  _session_id text,
  _device_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid, session_id text, text text, kind text, prompt_id uuid,
  prompt_text text, pinned boolean, addressed boolean, likes integer,
  created_at timestamp with time zone, device_id uuid, role audience_role,
  op_id uuid, liked_by_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    t.id, t.session_id, t.text, t.kind, t.prompt_id,
    p.text AS prompt_text,
    t.pinned, t.addressed, t.likes, t.created_at,
    t.device_id, t.role, t.op_id,
    (_device_id IS NOT NULL AND l.topping_id IS NOT NULL) AS liked_by_me
  FROM public.toppings t
  LEFT JOIN public.answer_prompts p ON p.id = t.prompt_id
  LEFT JOIN public.topping_likes  l
    ON _device_id IS NOT NULL
   AND l.topping_id = t.id
   AND l.device_id  = _device_id
  WHERE t.session_id = _session_id
  ORDER BY t.created_at DESC;
$function$;

-- 3) 세션 응답 텍스트 집계 (청중 파이/워드클라우드/카운트용). 안전 컬럼만.
CREATE OR REPLACE FUNCTION public.list_answer_texts_by_session(_session_id text)
RETURNS TABLE(id uuid, text text, prompt_id uuid, created_at timestamp with time zone)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT t.id, t.text, t.prompt_id, t.created_at
  FROM public.toppings t
  WHERE t.session_id = _session_id
    AND t.kind = 'answer'
  ORDER BY t.created_at DESC;
$function$;

-- 4) 인덱스 보강 (조건부, 있으면 skip)
CREATE INDEX IF NOT EXISTS idx_toppings_session_kind_created
  ON public.toppings (session_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_topping_likes_topping_device
  ON public.topping_likes (topping_id, device_id);
