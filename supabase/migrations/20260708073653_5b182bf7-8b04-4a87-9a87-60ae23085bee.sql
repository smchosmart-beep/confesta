
CREATE OR REPLACE FUNCTION public.set_topping_like(
  _topping_id uuid,
  _device_id uuid,
  _liked boolean,
  _op_id uuid
)
RETURNS TABLE(liked boolean, likes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed int;
  v_likes   int;
BEGIN
  IF _liked THEN
    INSERT INTO public.topping_likes (topping_id, device_id)
    VALUES (_topping_id, _device_id)
    ON CONFLICT (topping_id, device_id) DO NOTHING;
    GET DIAGNOSTICS v_changed = ROW_COUNT;

    IF v_changed = 1 THEN
      UPDATE public.toppings
      SET likes = COALESCE(likes, 0) + 1,
          op_id = _op_id
      WHERE id = _topping_id
      RETURNING likes INTO v_likes;
    ELSE
      SELECT t.likes INTO v_likes FROM public.toppings t WHERE t.id = _topping_id;
    END IF;

    RETURN QUERY SELECT true, COALESCE(v_likes, 0);
  ELSE
    DELETE FROM public.topping_likes
    WHERE topping_id = _topping_id AND device_id = _device_id;
    GET DIAGNOSTICS v_changed = ROW_COUNT;

    IF v_changed = 1 THEN
      UPDATE public.toppings
      SET likes = GREATEST(COALESCE(likes, 0) - 1, 0),
          op_id = _op_id
      WHERE id = _topping_id
      RETURNING likes INTO v_likes;
    ELSE
      SELECT t.likes INTO v_likes FROM public.toppings t WHERE t.id = _topping_id;
    END IF;

    RETURN QUERY SELECT false, COALESCE(v_likes, 0);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_topping_like(uuid, uuid, boolean, uuid) TO anon, authenticated, service_role;
