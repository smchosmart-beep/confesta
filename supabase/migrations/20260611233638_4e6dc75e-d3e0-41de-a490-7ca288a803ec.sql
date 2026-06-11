-- 1) Drop old data tied to am/pm period codes
DELETE FROM public.session_secrets
 WHERE session_id LIKE '%|am|%' OR session_id LIKE '%|pm|%';

DELETE FROM public.session_nonces
 WHERE session_id LIKE '%|am|%' OR session_id LIKE '%|pm|%';

DELETE FROM public.session_slots
 WHERE period IN ('am','pm');

-- 2) Replace CHECK constraint
ALTER TABLE public.session_slots
  DROP CONSTRAINT IF EXISTS session_slots_period_check;

ALTER TABLE public.session_slots
  ADD CONSTRAINT session_slots_period_check
  CHECK (period IN ('1000','1320','1530'));
