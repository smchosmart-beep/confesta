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
  v_session_id text;
  v_liked boolean;
  v_likes integer;
BEGIN
  SELECT t.session_id
  INTO v_session_id
  FROM public.toppings t
  WHERE t.id = _topping_id
  FOR UPDATE;

  IF v_session_id IS NULL THEN
    RETURN QUERY SELECT false, 0;
    RETURN;
  END IF;

  IF _liked THEN
    INSERT INTO public.topping_likes (topping_id, device_id, session_id)
    VALUES (_topping_id, _device_id, v_session_id)
    ON CONFLICT (topping_id, device_id) DO UPDATE
      SET session_id = EXCLUDED.session_id
      WHERE public.topping_likes.session_id IS DISTINCT FROM EXCLUDED.session_id;
  ELSE
    DELETE FROM public.topping_likes
    WHERE topping_id = _topping_id
      AND device_id = _device_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.topping_likes l
    WHERE l.topping_id = _topping_id
      AND l.device_id = _device_id
  )
  INTO v_liked;

  SELECT COUNT(*)::integer
  INTO v_likes
  FROM public.topping_likes l
  WHERE l.topping_id = _topping_id;

  UPDATE public.toppings
  SET likes = v_likes,
      op_id = _op_id
  WHERE id = _topping_id
  RETURNING public.toppings.likes INTO v_likes;

  RETURN QUERY SELECT v_liked, COALESCE(v_likes, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_topping_like(uuid, uuid, boolean, uuid) TO anon, authenticated, service_role;

DROP TRIGGER IF EXISTS topping_likes_fill_session_id_before_write ON public.topping_likes;
CREATE TRIGGER topping_likes_fill_session_id_before_write
BEFORE INSERT OR UPDATE OF topping_id ON public.topping_likes
FOR EACH ROW
EXECUTE FUNCTION public.topping_likes_fill_session_id();