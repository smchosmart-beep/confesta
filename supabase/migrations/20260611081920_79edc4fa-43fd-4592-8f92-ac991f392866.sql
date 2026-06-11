CREATE INDEX IF NOT EXISTS orders_session_id_idx   ON public.orders   (session_id);
CREATE INDEX IF NOT EXISTS scoops_session_id_idx   ON public.scoops   (session_id);
CREATE INDEX IF NOT EXISTS toppings_session_id_idx ON public.toppings (session_id);