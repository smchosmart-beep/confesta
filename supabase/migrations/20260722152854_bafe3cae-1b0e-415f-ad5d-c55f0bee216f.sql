ALTER TABLE public.topping_comments
ADD COLUMN IF NOT EXISTS author_kind TEXT NOT NULL DEFAULT 'audience'
CHECK (author_kind IN ('audience', 'presenter'));