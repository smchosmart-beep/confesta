# 질문 삭제 기능 (v4 – 3단계 배포)

행사 진행 중이므로 기존 정상 동작 코드는 손대지 않고, 3단계로 분리 배포한다. 각 단계는 독립적으로 롤백 가능.

## 사전 조사 결과 (확정)

- `topping_comments.topping_id` → `toppings.id` : **ON DELETE CASCADE** (자동)
- `topping_likes.topping_id`, `topping_gates.topping_id` : **FK 없음** → 명시적 DELETE 필요
- 삭제 순서: `topping_likes` → `topping_gates` → `toppings`

---

## Stage 1 — 서버/훅/스토어 추가 (UI 노출 없음)

배포해도 사용자 화면 변화 0. 문제 시 즉시 롤백 가능.

### 1-A. 서버 함수 `deleteToppingAsStaff`
`src/lib/confesta/toppings.functions.ts`에 신규 export 추가 (기존 함수 수정 금지).

- `createServerFn({ method: "POST" })` + `.middleware([requireSupabaseAuth])`
- 입력 검증: Zod `{ toppingId: string(uuid), sessionId: string }`
- 권한: `context.supabase.rpc('has_role', { _user_id, _role: 'admin' })` OR `'presenter'` → 실패 시 throw
- 실행 (순서 고정):
  1. `DELETE FROM topping_likes WHERE topping_id = $1`
  2. `DELETE FROM topping_gates WHERE topping_id = $1`
  3. `DELETE FROM toppings WHERE id = $1 AND session_id = $2`
  (`topping_comments`는 CASCADE로 자동 삭제)
- 마이그레이션/RLS/기존 RPC 변경 없음

### 1-B. 클라이언트 훅 `useDeleteTopping`
`src/hooks/use-delete-topping.ts` (신규).

- `useMutation` 래퍼, 낙관적 업데이트 없음 (Realtime + invalidate로 반영)
- 성공 시 관련 목록 쿼리 키만 `invalidateQueries`
- 실패 시 toast

### 1-C. 카운트 스토어 GC 헬퍼
`src/lib/confesta/comment-counts-store.ts`에 `dropTopping(id)` 함수만 추가 (기존 API 유지).

### Stage 1 검증
- `bun run build` 통과
- 앱 동작 변화 없음 확인 (배포 직후 청중/발표자/관리자 화면 스모크 테스트)

---

## Stage 2 — 관리자 화면에만 삭제 버튼 노출

`SlotToppingsModal.tsx`의 각 토핑 행에 🗑 버튼 + `AlertDialog` 확인 다이얼로그 추가. 성공 시 리스트 자동 갱신.

### Stage 2 검증 (실환경 1건 테스트)
- 테스트용 토핑 1건 실제 삭제
- 확인 항목:
  1. 관리자 목록에서 즉시 사라짐
  2. 청중 화면에서도 사라짐 (Realtime DELETE)
  3. 청중이 해당 항목에 눌렀던 좋아요/댓글이 orphan 없이 정리됨 (DB 재조회)
  4. 콘솔 에러 없음, 다른 토핑의 카운트에 영향 없음

문제 발생 시: `SlotToppingsModal`에서 버튼만 숨김 처리하여 즉시 롤백.

---

## Stage 3 — 발표자 화면 노출

Stage 2가 안정 확인된 후에만 진행.

- `QuestionStream.tsx`: 카드 우측에 삭제 버튼 (발표자 role일 때만)
- `QuestionSpotlightModal.tsx`: 헤더에 삭제 버튼, 성공 시 `onClose()`
- 발표자 Realtime 구독에 `event: 'DELETE'` 케이스 추가:
  - 열린 Spotlight가 삭제된 id면 자동 닫기 + toast
  - 목록 캐시에서 해당 id 제거
  - `dropTopping(id)` 호출로 카운트 스토어 정리

### Stage 3 검증
- 발표자가 삭제 → 모든 청중 화면·다른 발표자 탭에서 즉시 반영
- Spotlight 열어둔 다른 탭 자동 닫힘 확인

---

## 라이브 안전성 요약

| 항목 | 평가 |
|---|---|
| 청중 화면 회귀 | 청중 코드 미변경. Realtime DELETE로 자연 소거 |
| 서버비 | 삭제는 저빈도, 브로드캐스트 1건/삭제 → 무시 가능 |
| 기존 실시간/카운트 흐름 | 신규 케이스 추가만, 기존 핸들러 무변경 |
| 롤백 | 각 Stage 독립 롤백 (버튼 숨김 or import 제거) |
| 권한 | 서버 함수 내부 `has_role` 이중검증 |

각 Stage 배포 후 사용자 확인을 받고 다음 단계로 진행.
