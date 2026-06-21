CREATE TABLE public.topping_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topping_id uuid NOT NULL REFERENCES public.toppings(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  device_id uuid NOT NULL,
  role public.audience_role NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.topping_comments TO anon, authenticated;
GRANT ALL ON public.topping_comments TO service_role;

ALTER TABLE public.topping_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topping_comments public read"
  ON public.topping_comments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX topping_comments_topping_created_idx
  ON public.topping_comments(topping_id, created_at DESC);
CREATE INDEX topping_comments_session_idx
  ON public.topping_comments(session_id);

CREATE OR REPLACE FUNCTION public.topping_comments_fill_session_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NULL OR NEW.session_id = '' THEN
    SELECT session_id INTO NEW.session_id FROM public.toppings WHERE id = NEW.topping_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS topping_comments_fill_session_id_trg ON public.topping_comments;
CREATE TRIGGER topping_comments_fill_session_id_trg
BEFORE INSERT ON public.topping_comments
FOR EACH ROW EXECUTE FUNCTION public.topping_comments_fill_session_id();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.topping_comments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;