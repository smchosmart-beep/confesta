ALTER PUBLICATION supabase_realtime DROP TABLE public.toppings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.toppings
  (id, session_id, device_id, text, kind, prompt_id, pinned, addressed, role, created_at);