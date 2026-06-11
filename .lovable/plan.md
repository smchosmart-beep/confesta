## 문제

청중 화면 "토핑 추가" 탭의 "세션 선택" 드롭다운이 비어 보입니다. 주문은 정상적으로 등록되어 있지만(스크린샷의 402-A / LEWEST Hall A / 402-B 카드) 셀렉트 트리거에 라벨이 표시되지 않고 옵션도 렌더되지 않습니다.

## 원인

`src/routes/audience.tsx` 라인 349-356에서 옵션 라벨을 구할 때 옛 mock 데이터 `SESSIONS`(id가 `s1`…`s8`)에서만 찾습니다:

```tsx
const s = SESSIONS.find((x) => x.id === id);
if (!s) return null;
```

그러나 실제 주문의 `sessionId`는 슬롯 키 형식(예: `1|am|402-A`)이라 항상 매칭에 실패 → 모든 `SelectItem`이 `null`로 렌더되어 드롭다운이 비어 보이고, `SelectValue`도 표시할 자식이 없습니다.

`OrderCard.tsx`에는 이미 슬롯 키를 처리하는 `resolveSessionDisplay`가 있어서 주문 카드는 정상 표시됩니다.

## 수정

`src/routes/audience.tsx`만 수정:

1. `listIssuedSlots` 서버 함수를 `useQuery`로 호출하여 관리자에서 입력된 세션 제목(`title`)과 `room`을 가져옴 (캐시: staleTime 60s 정도).
2. `mySessionIds.map(...)` 부분을, 슬롯키 → `{ title, sub }` 매퍼로 교체:
   - 매처는 우선 `listIssuedSlots` 결과에서 `makeSlotKey(day,period,room) === id` 일치를 찾고
   - 없으면 `parseSlotKey(id)`로 폴백하여 `slot.room`을 라벨로 사용
   - 그래도 안 되면 legacy `SESSIONS.find`를 마지막 폴백으로
3. 옵션 라벨 형식: `"{title || room} · Day{n} · {오전|오후}"` — `OrderCard` 보조 라인과 톤 통일.

기존 단일 세션 자동 선택 로직(`useEffect`로 첫 항목 선택)은 그대로 유지. 다른 화면/기능에는 영향 없음 (변경 범위가 `audience.tsx` 한 파일의 드롭다운 옵션 렌더링뿐).

## 검증

- 주문 1건 이상 보유 시 드롭다운에 해당 세션 항목이 나타나고 트리거에 라벨이 보이는지 (관리자가 제목 입력한 슬롯/안 한 슬롯 둘 다).
- 주문이 없는 상태에서는 기존 "아직 참여 중인 세션이 없어요" 안내가 그대로 표시되는지.
