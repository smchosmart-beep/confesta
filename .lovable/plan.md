## 목표

관리자 대시보드를 서버 집계 기반으로 전환해 실데이터(주문/수령/토핑)를 정확히 표시.

## 변경

### 1. `src/lib/confesta/admin.functions.ts` (신규)

`getSlotAggregates({ day, period })` serverFn:
- 인증: 핸들러 내부에서 `await assertRole("admin")` 호출 (PIN 쿠키 기반, 기존 `listSlots` 패턴과 동일).
- 입력 검증: `day: number`, `period: "am" | "pm"` (zod).
- 핸들러 내부에서 `supabaseAdmin` 동적 import.
- 쿼리: `session_id` 프리픽스(`${day}|${period}|`)로 `orders`, `scoops`, `toppings`에서 `session_id` + 필요한 카운팅 컬럼만 select.
- 반환: `{ [slotKey]: { orders: number, pickups: number, toppings: number } }`.
  - `pickups`는 `orders.picked_up_at IS NOT NULL` 카운트 (스키마 확인 후, 만약 픽업이 별도 테이블이면 거기서).

### 2. `supabase/migrations/<ts>_slot_aggregate_indexes.sql` (신규)

세 테이블에 `session_id` 프리픽스/등치 검색 가속 인덱스:
```sql
CREATE INDEX IF NOT EXISTS orders_session_id_idx   ON public.orders   (session_id);
CREATE INDEX IF NOT EXISTS scoops_session_id_idx   ON public.scoops   (session_id);
CREATE INDEX IF NOT EXISTS toppings_session_id_idx ON public.toppings (session_id);
```
(실제 컬럼명은 마이그레이션 작성 전 `supabase--read_query`로 information_schema 확인 후 확정.)

### 3. `src/routes/admin.tsx` (편집)

- zustand `useConfestaStore`의 `orders/scoops/toppings` selector 제거.
- `useQuery(["admin-aggregates", selectedDay, selectedPeriod], () => getAggFn({ data: { day, period } }))`, `staleTime: 10_000`, `refetchInterval: 30_000`.
- `stats` useMemo에서 `aggregates[slotKey]` 조회. `pick = Math.min(pickups, orders)` 유지.
- `makeSlotKey` import는 그대로 유지.
- mock `SESSIONS`/`VENUES`는 capacity/타이틀 표시 용도만 유지.

## 검증

- Day1·오전·402-A 주문 1·수령 1 표시
- 빈 슬롯 0 유지
- 상단 KPI 합계 일치
- 다른 화면(청중/발표자/스태프) 영향 없음
