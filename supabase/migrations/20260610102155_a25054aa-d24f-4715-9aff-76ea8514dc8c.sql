
-- audience_devices
CREATE TABLE public.audience_devices (
  device_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.audience_devices TO service_role;
ALTER TABLE public.audience_devices ENABLE ROW LEVEL SECURITY;

-- orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  session_id text NOT NULL,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  picked_up_at timestamptz,
  UNIQUE (device_id, session_id)
);
CREATE INDEX orders_device_idx ON public.orders(device_id);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- scoops
CREATE TABLE public.scoops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  session_id text NOT NULL,
  flavor text NOT NULL,
  stacked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (device_id, session_id)
);
CREATE INDEX scoops_device_idx ON public.scoops(device_id);
CREATE INDEX scoops_session_idx ON public.scoops(session_id);
GRANT SELECT ON public.scoops TO anon, authenticated;
GRANT ALL ON public.scoops TO service_role;
ALTER TABLE public.scoops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scoops public read" ON public.scoops FOR SELECT TO anon, authenticated USING (true);

-- toppings
CREATE TABLE public.toppings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  device_id uuid NOT NULL,
  text text NOT NULL,
  kind text NOT NULL DEFAULT 'question',
  prompt_id uuid,
  pinned boolean NOT NULL DEFAULT false,
  addressed boolean NOT NULL DEFAULT false,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX toppings_session_idx ON public.toppings(session_id);
CREATE INDEX toppings_prompt_idx ON public.toppings(prompt_id);
GRANT SELECT ON public.toppings TO anon, authenticated;
GRANT ALL ON public.toppings TO service_role;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "toppings public read" ON public.toppings FOR SELECT TO anon, authenticated USING (true);

-- topping_likes
CREATE TABLE public.topping_likes (
  topping_id uuid NOT NULL,
  device_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topping_id, device_id)
);
GRANT ALL ON public.topping_likes TO service_role;
ALTER TABLE public.topping_likes ENABLE ROW LEVEL SECURITY;

-- topping_gates
CREATE TABLE public.topping_gates (
  session_id text PRIMARY KEY,
  questions_open boolean NOT NULL DEFAULT true,
  answers_open boolean NOT NULL DEFAULT false,
  active_prompt_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topping_gates TO anon, authenticated;
GRANT ALL ON public.topping_gates TO service_role;
ALTER TABLE public.topping_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topping_gates public read" ON public.topping_gates FOR SELECT TO anon, authenticated USING (true);

-- answer_prompts
CREATE TABLE public.answer_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX answer_prompts_session_idx ON public.answer_prompts(session_id);
GRANT SELECT ON public.answer_prompts TO anon, authenticated;
GRANT ALL ON public.answer_prompts TO service_role;
ALTER TABLE public.answer_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "answer_prompts public read" ON public.answer_prompts FOR SELECT TO anon, authenticated USING (true);

-- session_nonces
CREATE TABLE public.session_nonces (
  session_id text NOT NULL,
  kind text NOT NULL,
  nonce text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, kind)
);
GRANT ALL ON public.session_nonces TO service_role;
ALTER TABLE public.session_nonces ENABLE ROW LEVEL SECURITY;

-- receipts
CREATE TABLE public.receipts (
  token text PRIMARY KEY,
  device_id uuid NOT NULL,
  scoop_ids uuid[] NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  status text NOT NULL DEFAULT 'issued'
);
CREATE INDEX receipts_device_idx ON public.receipts(device_id);
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- slide_state
CREATE TABLE public.slide_state (
  id text PRIMARY KEY DEFAULT 'singleton',
  slide_index integer NOT NULL DEFAULT 0,
  slide_total integer NOT NULL DEFAULT 0,
  paused boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.slide_state (id) VALUES ('singleton');
GRANT SELECT ON public.slide_state TO anon, authenticated;
GRANT ALL ON public.slide_state TO service_role;
ALTER TABLE public.slide_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slide_state public read" ON public.slide_state FOR SELECT TO anon, authenticated USING (true);

-- Enable Realtime on tables that need it
ALTER PUBLICATION supabase_realtime ADD TABLE public.toppings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answer_prompts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topping_gates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scoops;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slide_state;

ALTER TABLE public.toppings REPLICA IDENTITY FULL;
ALTER TABLE public.answer_prompts REPLICA IDENTITY FULL;
ALTER TABLE public.topping_gates REPLICA IDENTITY FULL;
ALTER TABLE public.scoops REPLICA IDENTITY FULL;
ALTER TABLE public.slide_state REPLICA IDENTITY FULL;
