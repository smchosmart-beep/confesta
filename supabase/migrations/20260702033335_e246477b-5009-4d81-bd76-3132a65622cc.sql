
-- Session-scoped hot-path indexes to relieve 30-user concurrent read load.

-- toppings: list_toppings_with_my_like orders by created_at DESC per session
CREATE INDEX IF NOT EXISTS toppings_session_created_idx
  ON public.toppings (session_id, created_at DESC);
-- Superseded by the composite above
DROP INDEX IF EXISTS public.toppings_session_id_idx;

-- topping_likes: EXISTS(device_id=? AND topping_id=?) inside list_toppings_with_my_like
-- PK is (topping_id, device_id); add reverse-order index for device-first lookups.
CREATE INDEX IF NOT EXISTS topping_likes_device_topping_idx
  ON public.topping_likes (device_id, topping_id);

-- topping_comments: list by session_id ordered by created_at asc
CREATE INDEX IF NOT EXISTS topping_comments_session_created_idx
  ON public.topping_comments (session_id, created_at);
-- Superseded by the composite above
DROP INDEX IF EXISTS public.topping_comments_session_idx;
