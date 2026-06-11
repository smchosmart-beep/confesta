## 원인

`src/routes/admin.tsx` 133-204줄의 `stats` 계산에서 룸 이름 문자코드로 `seed`를 만들어 `baseOrders / basePickups / baseToppings` 를 가짜로 깔아두고, 그 위에 실제 라이브 카운트(`orders / scoops / toppings`)를 더하고 있음. 그래서 스크린샷처럼 아직 아무도 주문/수령/토핑을 안 했는데도 "주문 2, 수령 1, 토핑 1" 같은 숫자가 보임. 상단 합계 KPI(`주문 21·수령 13`)도 이 가짜값의 합.

## 수정 (admin.tsx 한 파일)

`stats` useMemo에서 baseline seed 로직을 전부 제거하고 실데이터만 사용:

```ts
const ord = session
  ? orders.filter((o) => o.sessionId === session.id).length
  : 0;
const pick = session
  ? Math.min(scoops.filter((sc) => sc.sessionId === session.id).length, ord)
  : 0;
const tops = session
  ? toppings.filter((t) => t.sessionId === session.id).length
  : 0;

return {
  code: code || "—",
  label: roomLabel,
  orders: ord,
  pickups: pick,
  capacity: session?.capacity ?? 30,
  sessionTitle: session?.title,
  toppings: tops,
};
```

- `seed`, `baseOrders`, `basePickups`, `baseToppings`, `liveOrders/livePickups/liveToppings` 분리 변수 삭제.
- 카운트는 모두 실제 store 값(0 출발)으로만 계산 → 카드/합계 KPI 모두 빈 상태에서 0 표시.

## 영향 범위

- 변경 파일: `src/routes/admin.tsx` 만.
- `mockData.ts`의 `SESSIONS / VENUES`는 평면도·세션 매칭에 계속 사용하므로 유지 (행사 공간 레이아웃은 데이터 아닌 구성 정보).
- `SAMPLE_TOPPINGS`, `SampleAnswerPromptCard` 등은 발표자/관객 다른 화면용이라 이번 요청 범위 밖 — 유지.

## 검증

- `/admin`에서 아직 주문/수령/토핑 활동이 없는 슬롯은 "주문 0 · 수령 0 · 토핑 0", 상단 KPI도 0.
- 청중이 실제 주문/수령/토핑을 하면 그 수만큼만 증가.