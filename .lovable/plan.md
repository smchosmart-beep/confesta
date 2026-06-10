## 목표
Admin이 **Day × 시간대 분류 안에서 각 공간 그리드 칸에 행사명을 직접 입력**하고, 그 칸 단위로 **독립된 주문 QR을 발급**할 수 있게 합니다. 서버는 `session_nonces`로 발급된 nonce를 보관하고 청중 스캔 시 일치 여부를 검증합니다. 수령 QR도 동일 저장소로 통합합니다.

## 데이터 모델

기존 `mockData.SESSIONS`(고정 행사명)는 **데모 베이스라인 표시용으로만** 두고, 실제 운영 데이터는 신규 테이블에서 관리합니다.

### 신규 테이블 `session_slots`
- 키: `(day, period, room)` UNIQUE — 예: `(1, 'am', '401-A')`.
- 컬럼: `title text not null default ''`, `capacity int`, `updated_at`.
- 의미: "Day1 오전 · 401-A 칸의 행사명". Admin이 입력/수정.

### 기존 `session_nonces` 재사용 + 키 변경
- 현재 PK 후보가 `session_id`인데, 슬롯 기반으로 가려면 `session_id`를 `"{day}:{period}:{room}"` 형태의 합성 키로 사용 (스키마 변경 없이 운영).
- `kind` ∈ `{'order','pickup'}`. `(session_id, kind)` UNIQUE 보강 마이그레이션.

## QR 동작

**주문 QR (Order) — 칸당 1개 고정, 영구 유효**
- Admin이 칸의 [발급] 버튼 → 서버가 `session_nonces` upsert (없으면 생성, 있으면 기존 반환).
- [재발급] 버튼 → nonce 회전, 이전 QR 즉시 무효.
- [QR 보기] 모달 → 큰 QR + 칸 라벨(예: "Day1 오전 · 401-A · 〈행사명〉") + 인쇄(window.print).

**수령 QR (Pickup) — 회전식**
- Presenter 모달 열린 동안 15초마다 서버 호출로 nonce 회전. 직전 nonce는 즉시 무효.

**서버 검증**
- `placeOrderFromQR` / `pickupFromQR`이 nonce 일치 여부 확인 → 불일치 시 "유효하지 않은 QR".

## 작업 항목

### 1. DB 마이그레이션
- `session_slots` 신규 테이블 + GRANT + RLS (admin/staff 쓰기는 서버 함수로 service_role 경유, anon SELECT 허용).
- `session_nonces`에 `UNIQUE(session_id, kind)` 추가.

### 2. 서버 함수 신규 (`src/lib/confesta/slots.functions.ts`)
- `listSlots({ day, period })` — 해당 분류의 모든 칸과 nonce 발급 상태를 반환.
- `upsertSlotTitle({ day, period, room, title })` — Admin PIN 인증.
- `issueOrderQR({ day, period, room })` — Admin PIN 인증, nonce 발급/반환.
- `rotateOrderQR({ day, period, room })` — Admin PIN 인증, nonce 회전.
- `rotatePickupNonce({ day, period, room })` — Presenter PIN 인증.

### 3. 기존 서버 함수 검증 추가 (`audience.functions.ts`)
- `placeOrderFromQR`, `pickupFromQR`에 nonce 비교 단계 추가.
- 페이로드 포맷은 `confesta:order:{day}:{period}:{room}:{nonce}`로 확장 (parser/maker 업데이트).

### 4. Admin UI (`src/routes/admin.tsx`)
- Day/시간대 필터(이미 추가됨) 선택 결과를 각 공간 카드 그리드에 반영.
- 각 칸(`SubStat` 카드)에 다음 컨트롤 추가:
  - **행사명 입력란** (인라인 편집, blur 시 `upsertSlotTitle` 호출 / 디바운스).
  - **[QR 발급]** 버튼 — 미발급 칸에서만 노출.
  - **[QR 보기]** / **[재발급]** 버튼 — 이미 발급된 칸.
- QR 보기 모달: 큰 QR, 칸 라벨, 인쇄 버튼.
- AdminAuthGate(PIN) 신규 컴포넌트로 화면 진입 보호 (`PresenterAuthGate` 패턴 재사용).
- 데이터는 TanStack Query (`listSlots` per 분류) + mutation invalidate.

### 5. Presenter (`src/routes/presenter.tsx`)
- 수령 QR 회전을 로컬 store → 서버 `rotatePickupNonce`로 이관.
- 페이로드는 `confesta:pickup:{day}:{period}:{room}:{nonce}`.

### 6. 정리
- `store.ts`의 `presenterNonces` 상태/액션 제거.
- `audience.functions.ts`의 "Strict nonce check is added later" 주석 제거.
- 기존 mockData SESSIONS는 평면도 베이스라인 숫자(시드)에만 사용, 행사명 표시는 `session_slots.title`이 우선.

## 보안 메모
- Admin/Presenter PIN으로 발급·회전 보호.
- Audience 스캔 경로는 nonce 비교만(PIN 불필요).
- Order QR 유출 시 [재발급]으로 대응. 인쇄용으로 칸 라벨이 함께 보이도록 모달에서 표시.

## 변경 파일
- 신규: `src/lib/confesta/slots.functions.ts`, `src/components/confesta/AdminAuthGate.tsx`, `src/components/confesta/SlotQRModal.tsx`.
- 수정: `admin.tsx`, `presenter.tsx`, `audience.functions.ts`, `shared.ts`(parser/maker), `store.ts`.
- DB: `session_slots` 생성 + `session_nonces` UNIQUE 보강.
