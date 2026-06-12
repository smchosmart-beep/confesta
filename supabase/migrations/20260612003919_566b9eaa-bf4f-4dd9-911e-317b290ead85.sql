
-- 1) 공개 SELECT 정책 (realtime row payload 전달 가능하게)
CREATE POLICY "orders public read"
  ON public.orders FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "topping_likes public read"
  ON public.topping_likes FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2) 서버 전용 테이블 — 명시적 deny-all
CREATE POLICY "receipts admin only"
  ON public.receipts FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "session_secrets admin only"
  ON public.session_secrets FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "session_nonces admin only"
  ON public.session_nonces FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "audience_devices admin only"
  ON public.audience_devices FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

-- 3) Realtime publication 확장
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_slots;

-- 4) 영수증 "내 토핑" 조회 인덱스
CREATE INDEX IF NOT EXISTS toppings_device_id_idx ON public.toppings (device_id);
