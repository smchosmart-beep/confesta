# Confesta (콘페스타) — 제품 스펙

> AI 디지털 컨퍼런스&페스티벌을 위한 게이미피케이션 플랫폼

---

## 1. 개요

Confesta는 컨퍼런스 참여를 아이스크림 한 콘에 담은 게이미피케이션 플랫폼이다. 주문(수강신청) → 출석 수령 → 토핑(질문/응답) → 영수증 발급으로 이어지는 흐름을 4개 역할(청중·발표자·스태프·관리자) 화면으로 제공한다.

**핵심 메타포**

- **콘 (Cone)** — 사용자의 컨퍼런스 참여 여정
- **주문 (Order)** — 세션 사전 예약 (주문 QR 스캔)
- **스쿱 (Scoop)** — 세션 출석/수령 증명 (최대 3개 적립, 수령 QR 스캔)
- **토핑 (Topping)** — 라이브 질문/키워드 응답
- **영수증 (Receipt)** — 3스쿱 적립 시 발급되는 디지털 보상 토큰

---

## 2. 세션 슬롯 모델

기존 하드코딩된 세션 ID 대신, 세션은 **슬롯(slot) = `day | period | room`** 3축 키로 식별된다.

- **day**: 1 ~ 10 (정수)
- **period**: `1000` (오전 10:00~11:50) · `1320` (오후 1교시 13:20~15:15) · `1530` (오후 2교시 15:30~17:25)
- **room**: 방/세션 식별 문자열 (예: `402-B`)
- **slotKey**: `` `${day}|${period}|${room}` ``  (QR payload는 `:` 구분자이므로 `|` 사용)

관리자가 슬롯에 **행사명(title)** 을 입력하고 **주문 QR** 을 발급하면 그 슬롯이 활성화된다. 발표자/청중 화면은 활성화된 슬롯만 보여준다.

---

## 3. QR 종류

| 종류 | 발급 주체 | 회전 주기 | payload 형식 |
|---|---|---|---|
| **주문 QR (order)** | 관리자 | 정적 (수동 재발급) | `confesta:order:{slotKey}:{nonce}` |
| **수령 QR (pickup)** | 발표자 | 15초 자동 회전 | `confesta:pickup:{slotKey}:{nonce}` |
| **영수증 (receipt)** | 청중 | 1회용 | `confesta:receipt:{sessionIds}:{ts}` |

- 주문 QR은 행사장에 인쇄해 비치 → 청중이 사전 주문(수강신청)에 사용
- 수령 QR은 발표 종료 직전 화면에 띄워 → 청중이 출석/수령 확정에 사용
- nonce는 발급 시 서버 `session_nonces` 테이블에 저장, 청중 스캔 시 일치 여부로 위조/만료 검증

### 3.1 QR 인쇄

`SlotQRModal`의 **인쇄** 버튼을 누르면 새 창에서 A4 페이지가 열린다.

- QR을 화면 기준 2배로 확대해 인쇄 (선명도 확보)
- 상단: 행사명(title) + 부제(`Day n · 오전/오후 · room`)
- 하단 푸터:
  - 작은 글씨: `2026 AI 디지털 컨퍼런스&페스티벌`
  - 큰 글씨(56px, weight 900): `Confesta`

---

## 4. 사용자 역할

### 4.1 청중 (Audience) — `/audience`

4개 탭으로 구성된 모바일 중심 뷰

| 탭 | 기능 |
|---|---|
| **주문** | 주문한 세션 카드 목록 + 카메라로 주문 QR 스캔 → `orders` 적재 |
| **My 콘** | 적립 스쿱 시각화(아이스크림 콘) + 수령 QR 스캔 → `scoops` 적립 |
| **토핑 추가** | 주문 세션 드롭다운 선택 → 라이브 질문/키워드 응답 전송 |
| **영수증** | 3스쿱 달성 시 디지털 영수증 발급/표시 |

- 청중 식별: 브라우저 `localStorage` 의 `deviceId` (UUID)
- 최대 주문 3건, 최대 스쿱 3개
- 동일 세션 중복 주문 차단(DB unique), 동일 세션 중복 수령 차단(`picked_up_at`)

### 4.2 발표자 (Presenter) — `/presenter`

- 활성화된 슬롯만 드롭다운(Day → 시간대 → 세션)으로 노출
- 슬롯별 **비밀번호**로 잠금 해제 (관리자가 설정, 쿠키 12시간 유지)
- 잠금 해제 후 헤더 카드에 두 개 버튼:
  - **주문 QR** (블루베리) — 관리자가 발급한 주문 QR을 모달로 표시 (회전 없음, 인쇄 가능)
  - **수령 QR** (스트로베리) — 15초 자동 회전, 인쇄 가능, 수동 재발급 가능
- 본문: 토핑 키워드 응답(원형 차트) + 라이브 질문 스트림 + 스포트라이트 모달
- 세션 잠그기 버튼으로 슬롯 쿠키 제거

### 4.3 운영 스태프 (Staff) — `/staff`

- 영수증 QR 스캐너
- 토큰 검증: `confesta:receipt:{sessionIds}:{ts}` 형식 + `receipts` 테이블 존재 + `status` 확인
- 검증 결과 — success / duplicate / invalid

### 4.4 관리자 (Admin) — `/admin`

- 일자/시간대/방별 슬롯 그리드
- 슬롯당:
  - 행사명(title) 인라인 편집
  - 주문 QR 발급 / 재발급 / 모달로 확인 + 인쇄
  - 발표자 비밀번호 설정/변경/삭제
- 운영 현황 대시보드 (출석 깔때기, 토핑 통계)

---

## 5. 데이터 모델 (Lovable Cloud / Postgres)

| 테이블 | 용도 | 주요 컬럼 |
|---|---|---|
| `session_slots` | 슬롯 메타 | `day, period, room, title` (PK `day,period,room`) |
| `session_nonces` | QR nonce 저장 | `session_id (slotKey), kind ('order'|'pickup'), nonce, rotated_at` |
| `session_secrets` | 발표자 비밀번호 | `session_id, password_hash, set_at` |
| `orders` | 청중 주문 | `id, device_id, session_id, ordered_at, picked_up_at` |
| `scoops` | 적립 스쿱 | `id, device_id, session_id, flavor, stacked_at` |
| `receipts` | 영수증 | `token, device_id, scoop_ids, issued_at, redeemed_at, status` |
| `audience_devices` | 청중 last_seen | `device_id, last_seen` |
| `toppings` / `prompts` 등 | 질문·키워드 응답 | (실시간 채널 연동) |

- 모든 테이블 RLS 활성화, public 권한은 정책 + GRANT 로 명시
- 권한 검증: `assertRole('admin'|'staff')`, `assertPresenterSlot(slotKey)` (슬롯 쿠키 12h)
- 실시간: `subscribeOrders`, `subscribeSlots` 채널로 발표자/관리자 화면 즉시 갱신

---

## 6. 핵심 워크플로우

### 6.1 슬롯 활성화 (관리자)

```
관리자 → upsertSlotTitle(day, period, room, title)
       → issueOrderQR(day, period, room)   // session_nonces 에 order 행 생성
       → setSlotPresenterPassword(day, period, room, password)
```

### 6.2 주문 → 수령 → 스쿱 적립

```
청중: 주문 QR 스캔 → placeOrderFromQR(deviceId, payload)
   → parseSessionQR + session_nonces 일치 검증 + 최대 3건 + 중복 차단
   → orders insert

발표자: 슬롯 잠금 해제 → 수령 QR 모달 오픈
   → issuePickupQR (없으면 생성) → 15초마다 rotatePickupQR

청중: 수령 QR 스캔 → pickupFromQR(deviceId, payload)
   → nonce 일치 + 해당 세션 주문 보유 + 미수령 + 스쿱 3개 미만
   → scoops insert (flavor = 슬롯 room 해시 기반) + orders.picked_up_at 갱신
```

### 6.3 영수증 발급 → 교환

```
청중: scoops 3개 도달 → generateReceipt(deviceId) → receipts insert
스태프: 영수증 QR 스캔 → redeemReceipt(token)
   → success | duplicate | invalid
```

### 6.4 토핑(질문/응답)

```
청중: 주문한 세션 선택 → 텍스트/키워드 응답 전송
발표자: AnswerPie + QuestionStream 실시간 표시, 핀/답변완료/스포트라이트
```

---

## 7. 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | TanStack Start v1 (Vite 7 + React 19) |
| 백엔드 | Lovable Cloud (Postgres + Realtime + Auth + Storage) |
| 서버 로직 | `createServerFn` (TanStack Start), 슬롯 쿠키 인증 |
| 스타일링 | Tailwind CSS v4 (네이티브 CSS `@import`, `@theme inline`) |
| UI 컴포넌트 | shadcn/ui |
| 상태 관리 | TanStack Query (서버 상태) + Zustand (UI 로컬 상태) |
| 라우팅 | TanStack Router (파일 기반) |
| QR | `react-qr-code` |
| 아이콘 | Lucide React |
| 폰트 | Pretendard |
| 빌드 타겟 | Edge (Cloudflare Workers) |

---

## 8. 제약사항 및 보안

- **QR nonce 검증**: 모든 청중 액션은 서버에서 `session_nonces` 와 대조 → 위조·만료 QR 거부
- **수령 QR 15초 회전**: 화면 캡처 재사용 방지
- **발표자 비밀번호**: 슬롯별 해시 저장, 검증 성공 시 슬롯 전용 쿠키(httpOnly, secure, SameSite=None, 12h)
- **스쿱/주문 상한**: 디바이스당 각각 3개
- **권한**:
  - 관리자만 슬롯 title/주문 QR/비밀번호 조작
  - 발표자(슬롯 쿠키)만 수령 QR 발급·회전 및 본인 슬롯의 주문 QR 조회
  - 스태프만 영수증 검증
- **데모 특성**: 청중 식별은 익명 deviceId (UUID) 기반, 회원가입 없음
