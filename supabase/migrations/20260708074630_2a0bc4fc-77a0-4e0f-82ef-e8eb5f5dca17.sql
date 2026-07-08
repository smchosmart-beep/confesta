REVOKE EXECUTE ON FUNCTION public.set_topping_like(uuid, uuid, boolean, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_topping_like(uuid, uuid, boolean, uuid) TO service_role;