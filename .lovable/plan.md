# Stage 2 (보강판) — 관리자 화면에만 삭제 버튼 노출

Stage 1에서 배포된 `useDeleteTopping` 훅과 `deleteToppingAsStaff` 서버 함수를 관리자 모달에만 우선 연결합니다. 안전성 검토에서 발견된 **캐시 키 불일치 버그**를 함께 수정합니다.

## 수정 파일 (2개)

### 1. `src/hooks/use-delete-topping.ts` — 캐시 무효화 predicate에 admin 모달 키 추가

현재 predicate는 `toppings-admin`은 감지하지만 `SlotToppingsModal`이 실제 사용하는 **`["admin-toppings", sessionId]`**(어순 반대)를 놓치고 있음. → 삭제해도 관리자 모달 리스트가 15초 후에나 갱신됨.

```ts
predicate: (q) => {
  const k = q.queryKey?.[0];
  return (
    k === "toppings-presenter" ||
    k === "toppings" ||
    k === "toppings-admin" ||
    k === "admin-toppings" ||   // ← 추가
    k === "slot-toppings" ||
    k === "slot-aggregates" ||
    k === "comment-counts"
  );
},
```

### 2. `src/components/confesta/SlotToppingsModal.tsx` — 삭제 UI 추가

- import 추가: `useState`, `Trash2`(lucide), `useDeleteTopping`, `AlertDialog` 계열(`AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`).
- 상태: `const [pendingId, setPendingId] = useState<string | null>(null);`
- 훅: `const del = useDeleteTopping();`
- 질문 리스트 각 `<li>` 우측: 작은 🗑 버튼 (`w-7 h-7`, `text-muted-foreground hover:text-destructive`, `shrink-0`).
- 응답 리스트 각 `<li>` 우측: hover-only 🗑 (`opacity-0 group-hover:opacity-100 focus-within:opacity-100`)로 시각 노이즈 최소화. 부모 `<li>`에 `group` 추가.
- 클릭 시 `setPendingId(t.id)`.
- 하단에 단일 `AlertDialog`:
  - `open={pendingId !== null}`
  - 제목: "이 토핑을 삭제할까요?"
  - 설명: "삭제 후에는 되돌릴 수 없어요. 청중/발표자 화면에서도 즉시 사라집니다."
  - 취소: `setPendingId(null)`, `disabled={del.isPending}`.
  - 삭제: `del.mutate({ sessionId, toppingId: pendingId }, { onSettled: () => setPendingId(null) })`, `disabled={del.isPending}`.
  - **자체 toast 호출 없음** — 훅이 이미 처리(중복 방지).

## 검토된 안전 사항

| 항목 | 결과 |
| --- | --- |
| 서버비 | 신규 구독/폴링 없음. 삭제당 RPC 1회 + 기존 realtime 재사용 |
| 다른 화면 회귀 | 발표자/청중 코드 미변경. 훅 predicate 확장은 추가 무효화만 |
| 권한 우회 | 서버 함수에서 admin/presenter 이중 검증(Stage 1) |
| `topping_comments` | FK CASCADE로 자동 정리 |
| `topping_likes` | 서버 함수에서 명시적 선삭제 |
| 댓글 카운트 스토어 | `dropTopping()`로 GC |
| Realtime 폭주 | 이미 구독 중인 DELETE 이벤트만 발생 |
| 관리자 게이트 | `/admin` 라우트 + 서버 함수 재검증 |

## 롤백

문제 발생 시 `SlotToppingsModal`의 🗑 버튼 렌더만 제거하면 즉시 비활성화. 훅/서버 함수는 남겨도 무해.

## 스모크 테스트 (개발 서버)

1. `/admin` → 슬롯 "토핑확인" → 질문 1건 삭제 → **즉시** 리스트에서 사라짐(캐시 키 보강 검증).
2. 별도 탭 `/present/...` 열어두고 삭제 → 발표자 화면 실시간 제거.
3. 청중 탭에서도 즉시 제거.
4. 댓글 달린 질문 삭제 → 성공, 콘솔 warn 없음.
5. 응답 토핑 1건 삭제 → 리스트 감소.
6. 삭제 취소 버튼 → 변화 없음.
7. 성공 토스트 **1회만** 표시(중복 방지 확인).

전부 통과 시 Stage 3(발표자 화면 노출)로 진행.
