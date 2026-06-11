## 원인

청중이 주문/수령한 데이터의 `order.sessionId`는 슬롯키 형식(`"1|am|402-A"`)이고, store의 `orders / scoops / toppings`에도 모두 그 슬롯키가 들어 있음. 그런데 관리자 대시보드(`src/routes/admin.tsx`)는 mockData의 `SESSIONS`에서 room/day/period로 매칭한 후 `session.id`(예: `"s1"`)로 필터링하고 있어 절대 매칭되지 않음. 그래서 실데이터가 있어도 "주문 0, 수령 0, 토핑 0" 으로만 보임.

스크린샷 401-A에 "주문 1"이 보이는 건 `SESSIONS`의 s1이 401-A로 매핑돼 있어 우연히 다른 슬롯의 주문이 잘못 잡힌 케이스로 추정 — 사실상 잘못된 매칭임.

## 수정 (`src/routes/admin.tsx` 한 파일)

`stats` useMemo 안에서 슬롯키 기반으로 카운트를 계산:

1. `shared.ts`의 `makeSlotKey` 임포트 추가.
2. 각 sub(룸 코드)마다 `slotKey = makeSlotKey(selectedDay, selectedPeriod, roomLabel)` 생성.
3. 카운트는 슬롯키로 매칭:
   - `orders.filter(o => o.sessionId === slotKey).length`
   - `scoops.filter(sc => sc.sessionId === slotKey).length`
   - `toppings.filter(t => t.sessionId === slotKey).length`
4. mock `SESSIONS` 매칭은 capacity/title 표시용으로만 유지 (없어도 0으로 그대로 동작).
5. `pick`은 `Math.min(pickRaw, ord)` 그대로.

## 검증

- `/admin` Day1 · 오전 · 402-A: 청중에서 실제로 주문/수령한 1건이 "주문 1 · 수령 1"로 표시.
- 활동 없는 슬롯은 0 유지.
- 상단 KPI 합계도 실데이터 합산과 일치.