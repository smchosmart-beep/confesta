REVOKE EXECUTE ON FUNCTION public.get_slot_aggregates(int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_slot_aggregates(int, text) TO service_role;