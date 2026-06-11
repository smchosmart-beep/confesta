## 목표
청중이 자신이 보낸 질문(토핑)을 직접 삭제할 수 있게 합니다. 작성자 본인 기기에서만 삭제 가능하며, 발표자가 라이브로 다루는 중인 질문은 보호합니다.

## 동작 규칙
- 청중 화면(`/audience`) "궁금해요" 목록에서 **본인 질문**에만 휴지통 아이콘 표시.
- **단, `pinned` 또는 `addressed` 상태인 질문은 휴지통 버튼 자체를 숨김** (발표자가 라이브로 다루는 중이므로 보호).
- 클릭 시 **shadcn `AlertDialog`** 확인 모달 → 삭제. 모바일에서 차단되는 `window.confirm`은 사용하지 않음.
- 삭제 시 해당 질문 + 좋아요 기록 모두 제거, Realtime으로 발표자/다른 청중 화면 자동 반영.
- 본 변경의 범위는 **질문(kind=question)** 만. 답변은 별도 UX라 이번 작업에는 포함하지 않음.

## 변경 사항

### 1. 서버 함수 (`src/lib/confesta/toppings.functions.ts`)
- `deleteOwnTopping` 새 serverFn 추가
  - 입력: `{ deviceId: uuid, toppingId: uuid }`
  - 처리:
    1. `toppings`에서 `id=toppingId` 조회 (`device_id, pinned, addressed`).
    2. 없거나 `device_id` 불일치 → `{ ok:false, message:"본인이 보낸 질문만 삭제할 수 있어요" }`.
    3. `pinned || addressed` → `{ ok:false, message:"발표자가 다루는 중이라 삭제할 수 없어요" }`.
    4. `topping_likes` 명시 삭제 → `toppings` 삭제.
- `listToppings` 응답 `ToppingDTO`에 `mine: boolean` 필드 추가 (서버에서 `row.device_id === input.deviceId` 비교).

### 2. 훅 (`src/hooks/use-toppings.ts`)
- `deleteOwnTopping` import + `useMutation` 추가, `onSuccess`에 기존 invalidate 패턴 적용.
- 반환 객체에 `deleteOwn: (toppingId) => Promise<{ok, message?}>` 추가 (mutateAsync로 에러 메시지 토스트 노출 가능하게).

### 3. UI (`src/routes/audience.tsx`)
- "궁금해요" 목록 `li`에서 `t.mine && !t.pinned && !t.addressed`일 때만 좋아요 버튼 옆에 작은 휴지통 버튼 렌더.
- 클릭 시 shadcn `AlertDialog`로 "이 질문을 삭제할까요? 되돌릴 수 없어요." 확인 → `deleteOwn(t.id)` 호출.
- 서버가 `ok:false` 반환 시 `sonner` 토스트로 사유 노출 (예: 발표자가 핀/답변완료 처리한 직후 race condition 대비).
- 스타일: 옅은 회색 → hover 시 빨강 톤, 기존 좋아요 버튼과 동일 사이즈.

### 4. 데이터 무결성 / 마이그레이션
- 없음. `topping_likes`는 서버 함수에서 명시 삭제하므로 FK CASCADE 의존 없음.

## 부작용 검토 (확정)
- **기능**: 발표자 보호 조건으로 라이브 발표 중 질문이 사라지는 UX 사고 차단. 작성자도 핀/답변완료 전이라면 자유 삭제.
- **서버비**: 청중당 삭제 빈도 매우 낮음, PK 인덱스 DELETE 2건, 추가 Realtime 채널/구독 없음 → 사실상 0 추가 비용.
- **다른 기능**: pin/addressed/like/orders/scoops/slide_state 등 모든 도메인과 분리, 영향 없음.
- **Race condition**: 발표자가 핀 누르는 동시에 청중이 삭제 누르는 경우 → 서버 측 최신 행 기준 판정, UI는 토스트로 거부 사유 표시.
- **보안**: device_id UUID v4 추측 불가. 공용 기기 위험은 기존 좋아요 모델과 동일 수준.

## 영향 파일
- 수정: `src/lib/confesta/toppings.functions.ts`, `src/hooks/use-toppings.ts`, `src/routes/audience.tsx`
- 신규: 없음
- 마이그레이션: 없음
