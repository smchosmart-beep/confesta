-- 1-A. topping_likes.session_id 비정규화
ALTER TABLE public.topping_likes ADD COLUMN IF NOT EXISTS session_id text;

UPDATE public.topping_likes l
SET session_id = t.session_id
FROM public.toppings t
WHERE l.topping_id = t.id AND l.session_id IS NULL;

ALTER TABLE public.topping_likes ALTER COLUMN session_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS topping_likes_session_id_idx ON public.topping_likes(session_id);

CREATE OR REPLACE FUNCTION public.topping_likes_fill_session_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.session_id IS NULL THEN
    SELECT session_id INTO NEW.session_id FROM public.toppings WHERE id = NEW.topping_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS topping_likes_fill_session_id_trg ON public.topping_likes;
CREATE TRIGGER topping_likes_fill_session_id_trg
BEFORE INSERT ON public.topping_likes
FOR EACH ROW EXECUTE FUNCTION public.topping_likes_fill_session_id();

-- 1-B. 인덱스 보장
CREATE INDEX IF NOT EXISTS toppings_session_id_idx ON public.toppings(session_id);
CREATE INDEX IF NOT EXISTS answer_prompts_session_id_idx ON public.answer_prompts(session_id);
CREATE INDEX IF NOT EXISTS topping_gates_session_id_idx ON public.topping_gates(session_id);

-- 1-C. Realtime publication 등록 (이미 등록된 경우 무시)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.toppings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.topping_likes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.answer_prompts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.topping_gates; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;