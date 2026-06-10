CREATE TABLE public.session_slots (
  day integer NOT NULL,
  period text NOT NULL,
  room text NOT NULL,
  title text NOT NULL DEFAULT '',
  capacity integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (day, period, room),
  CHECK (period IN ('am','pm'))
);

GRANT SELECT ON public.session_slots TO anon, authenticated;
GRANT ALL ON public.session_slots TO service_role;

ALTER TABLE public.session_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_slots public read"
  ON public.session_slots
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.touch_session_slot_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER session_slots_updated_at
  BEFORE UPDATE ON public.session_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_session_slot_updated_at();
