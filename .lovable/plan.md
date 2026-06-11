## 배경 / 목표

- 동시 청중 최대 2000명, 세션당 50–600명.
- 현재 "5초마다 갱신" 안내와 달리 새로고침 전에는 갱신되지 않는 문제.
- 목표: **Realtime을 메인 경로**, 연결 단절 시에만 폴링되는 안전망. 좋아요까지 실시간 반영. DB/Realtime 부하 최소화, 기존 기능 무영향.

## 동작 모델

```text
[정상]   Realtime 구독 OK    →  폴링 OFF
[비정상] CHANNEL_ERROR/TIMED_OUT/CLOSED 또는 초기 SUBSCRIBED 8s 미수신
        →  폴링 30s ON + 지수 백오프 재구독
[복구]   SUBSCRIBED 복귀     →  폴링 OFF, 백오프 리셋
```

## 1) DB 마이그레이션

### 1-A. `topping_likes`에 `session_id` 비정규화 컬럼 추가 (좋아요 실시간 필터링용)

- 컬럼 추가 → 기존 행 백필 → NOT NULL → 인덱스 → 트리거(향후 INSERT 시 자동 채움) → publication 등록.

```sql
ALTER TABLE public.topping_likes ADD COLUMN IF NOT EXISTS session_id text;

UPDATE public.topping_likes l
SET session_id = t.session_id
FROM public.toppings t
WHERE l.topping_id = t.id AND l.session_id IS NULL;

ALTER TABLE public.topping_likes ALTER COLUMN session_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS topping_likes_session_id_idx ON public.topping_likes(session_id);

-- INSERT 시 session_id 자동 채움(서버 코드 변경 없이 안전)
CREATE OR REPLACE FUNCTION public.topping_likes_fill_session_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.session_id IS NULL THEN
    SELECT session_id INTO NEW.session_id FROM public.toppings WHERE id = NEW.topping_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS topping_likes_fill_session_id_trg ON public.topping_likes;
CREATE TRIGGER topping_likes_fill_session_id_trg
BEFORE INSERT ON public.topping_likes
FOR EACH ROW EXECUTE FUNCTION public.topping_likes_fill_session_id();
```

### 1-B. 폴링 안전망 인덱스 보장

```sql
CREATE INDEX IF NOT EXISTS toppings_session_id_idx ON public.toppings(session_id);
CREATE INDEX IF NOT EXISTS answer_prompts_session_id_idx ON public.answer_prompts(session_id);
CREATE INDEX IF NOT EXISTS topping_gates_session_id_idx ON public.topping_gates(session_id);
```

### 1-C. Realtime publication 등록 보장

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.toppings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topping_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answer_prompts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.topping_gates;
-- 이미 등록된 경우 에러는 무시(별도 DO 블록으로 try-skip 처리).
```

## 2) 공용 싱글톤 채널 매니저: `src/lib/confesta/realtime-channel.ts` (신규)

세션 단위 채널 1개를 refCount로 공유. 컴포넌트 인스턴스 수와 무관하게 채널/폴링은 세션당 1개.

- 내부 상태: `Map<sessionId, { channel, refCount, listeners:Set<()=>void>, healthy:boolean, backoff:{attempt, timer}, initialTimer }>`.
- API:
  - `subscribeToppings(sessionId, onChange) → unsubscribe`
  - `subscribePrompts(sessionId, onChange) → unsubscribe`
  - `subscribeGate(sessionId, onChange) → unsubscribe`
  - `useRealtimeHealth(sessionId): boolean` — `useSyncExternalStore` 기반, 모든 훅 인스턴스가 동일한 `isRealtimeBroken` 값 공유.
- 채널 필터:
  - `toppings`: `filter: session_id=eq.{sessionId}`
  - `topping_likes`: `filter: session_id=eq.{sessionId}` ← 1-A 완료 후 가능
  - `answer_prompts`, `topping_gates`: 동일 필터
- 헬스 판정:
  - 구독 후 **8초** 내 `SUBSCRIBED` 미수신 → `healthy=false`.
  - `SUBSCRIBED` → `healthy=true`, 백오프/initialTimer 클리어.
  - `CHANNEL_ERROR | TIMED_OUT | CLOSED` → `healthy=false` 후 재구독 스케줄.
- 재구독 정책 (썬더링 허드 방지):
  - 초기 지터 `random(0, 2000ms)`.
  - 지수 백오프 `1s → 2s → 4s → 8s → 16s → 30s 상한`, 각 단계 ±20% 지터.
  - 재구독 콜백 진입 시 **엔트리 생존 가드**: `Map.has(sessionId) && refCount>0` 일 때만 실행.
- cleanup 순서: `clearTimeout(initialTimer)` → `clearTimeout(backoff.timer)` → `supabase.removeChannel(channel)` → `Map.delete(sessionId)`.

## 3) 훅 수정

### `src/hooks/use-toppings.ts`

- 기존 `useEffect`의 직접 `supabase.channel(...)` 제거. `subscribeToppings(sessionId, () => qc.invalidateQueries(...))`로 교체.
- 좋아요 변경도 같은 매니저가 처리(1-A 적용 후 세션 필터링됨).
- React Query 옵션:
  ```ts
  staleTime: 5_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchIntervalInBackground: false,
  refetchInterval: isRealtimeBroken ? 30_000 : false,
  ```
- mutation `onSuccess` invalidate는 유지(본인 액션 즉시 반영).

### `src/hooks/use-answer-prompts.ts`, `src/hooks/use-topping-gate.ts`

- 동일 패턴으로 매니저 호출 교체 + 동일 React Query 옵션.

## 4) `src/routes/presenter.tsx`

- 안내 문구 `5초마다 갱신` → **`실시간 응답 · 키워드 5초마다 재배치`**.
- `ToppingTubScene` 내부 5초 `setInterval`은 시각적 재배치용이므로 유지.

## 부하/리스크 검토 (2000 동접 기준)

- 정상시 폴링 0 QPS. 부담은 Realtime fan-out뿐, 각 채널 세션 필터 적용으로 본인 세션 변경만 수신.
- 채널 총수: 세션당 3개(toppings/prompts/gate) × 활성 세션 수. 청중 디바이스 수에 무관.
- 좋아요 폭주(예: 600명이 1초 내 좋아요) → INSERT N건 → Realtime 이벤트 N건이지만 React Query가 동일 tick 내 invalidate를 dedupe, 실제 fetch는 staleTime/in-flight 병합으로 수렴.
- 장애시 최악 폴링: 2000 × 3쿼리 / 30s ≈ **200 QPS**, 인덱스 SELECT로 안전.
- 다른 기능(orders/scoops/slots/receipts/slide_state/audience) 영향 없음 — 별도 queryKey/별도 채널.

## 검증

- `topping_likes.session_id` 백필 결과 NULL 0건 확인.
- 정상 상태: 새 응답/좋아요 1–2초 내 반영, Network 폴링 호출 0건.
- WiFi off→on: 자동 재구독.
- Realtime publication 일부러 제외 시 8초 후 30s 폴링 동작.
- 다중 탭/다중 컴포넌트: 동일 세션이면 채널 1개, 폴링 1개.
- presenter 안내 문구 변경 확인.

## 영향 파일

- 마이그레이션: 1건 (위 1-A/1-B/1-C 통합).
- 신규: `src/lib/confesta/realtime-channel.ts`.
- 수정: `src/hooks/use-toppings.ts`, `src/hooks/use-answer-prompts.ts`, `src/hooks/use-topping-gate.ts`, `src/routes/presenter.tsx`.
