
REVOKE EXECUTE ON FUNCTION public.list_toppings_for_presenter(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_toppings_for_presenter(text, uuid) TO service_role;
