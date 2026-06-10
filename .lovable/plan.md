## 컨셉

아이스크림 가게 비유 정렬:
- **등록 QR** = **주문** (세션 장소 도착 시 스캔 → 주문 카드 생성)
- **출석 QR** = **수령** (세션 종료 직전 스캔 → 아이스크림 픽업, 스쿱 적립)

청중 화면의 "수강신청"은 외부 시스템으로 분리 → 잔여좌석/신청 UI 삭제.

## 1. QR 페이로드 / 상태 (`src/lib/confesta/store.ts`)

기존 `attend:` 한 종류 → 두 종류로 분리.

```text
confesta:order:{sessionId}:{nonce}    ← 주문(도착 시)
confesta:pickup:{sessionId}:{nonce}   ← 수령(종료 직전)
```

헬퍼: `makeOrderQR / parseOrderQR`, `makePickupQR / parsePickupQR`, 통합 `parseSessionQR(payload) → { kind: 'order' | 'pickup', sessionId, nonce } | null`.

새 모델:
```ts
interface Order {
  id: string;             // `order-${sessionId}`
  sessionId: string;
  orderedAt: number;      // 주문 시각
  pickedUpAt: number | null; // 수령 시각
}
```

스토어 변경:
- 추가: `orders: Order[]`
- 액션:
  - `placeOrderFromQR(payload)` — order QR만 처리, 중복 주문이면 reason 반환
  - `pickupFromQR(payload)` — pickup QR만 처리. 해당 sessionId의 주문이 있고 아직 미수령일 때만 성공. 성공 시 `pickedUpAt` 기록 **+ 기존 스쿱 적립/attendanceCounts++ 로직 수행**
- `addScoopFromQR`는 내부 전용으로 흡수
- `enrolledSessionIds`/`toggleEnroll`은 그대로 둠 (UI에서만 미사용)
- 발표자 nonce 구조 확장: `presenterNonces: Record<sessionId, { order: string; pickup: string }>`, `rotatePresenterNonce(sessionId, kind)`

## 2. 주문 탭 UI (`src/routes/audience.tsx`)

기존 `explore` 섹션 교체 (Day 토글 / SessionCard 그리드 제거).

- **빈 상태(주문 0건)**: 안내 + 큰 그라데이션 CTA `주문 QR 스캔하기`. 누르면 인라인 `CameraScanner`.
- **주문 1건 이상**: 상단 작은 CTA `+ 주문 추가` + `OrderCard` 리스트(최신순).

스캔 결과 분기:
- `order` → 신규 주문 생성, 토스트 "주문이 접수됐어요 🍨"
- `pickup` → "주문 탭에서는 주문 QR을, 수령 QR은 각 주문 카드에서 찍어주세요" 안내
- 그 외 → 오류

## 3. OrderCard 컴포넌트 신규 (`src/components/confesta/OrderCard.tsx`)

비주얼 톤: ReceiptCard/SessionCard와 일관(둥근 카드 + `bg-grad-sunset-soft` + ToppingScatter).

구성:
- 상단: 카테고리 플레이버 칩 + 시간/장소
- 본문: 세션 제목 / 발표자
- **단계 뱃지(우상단)**:
  - 1단계 `주문 접수` (`bg-grad-muted`)
  - 2단계 `수령 완료` (`bg-grad-success`) — `pickedUpAt` 존재 시
- 액션:
  - 미수령 → `수령 QR 스캔` 버튼(grad-strawberry). 클릭 시 카드 하단 인라인 `CameraScanner` 펼침
  - 수령 완료 → "✓ HH:mm 수령 완료" 정적 라벨
- 스캐너 분기:
  - 같은 sessionId + pickup → 성공
  - 다른 sessionId의 pickup → "다른 세션의 수령 QR입니다"
  - order QR → "이건 주문 QR이에요"

## 4. SessionCard 정리 (`src/components/confesta/SessionCard.tsx`)

- 잔여 좌석 진행바 삭제
- 신청하기/신청완료 버튼 삭제
- 관련 imports(`useConfestaStore`, `Check` 등) 정리
- 정보 전용 카드로 축소 (다른 곳 사용처는 검토 후 유지/정리)

## 5. My 콘 탭

- 카메라 스캐너를 **수령 QR 전용**(`pickupFromQR`)으로 동작 변경. 주문 QR을 비추면 "주문 탭에서 주문 QR을 먼저 스캔하세요" 안내.
- 스쿱 누적/영수증 로직은 그대로.

## 6. 발표자 QR 출력 (`src/routes/presenter.tsx` 및 관련 QR 컴포넌트)

세션 하나당 **주문 QR**과 **수령 QR** 두 개를 노출:
- Stage 모드: 좌/우 두 QR을 라벨과 함께(`주문` / `수령`) 나란히
- Handheld 모드: 토글로 `주문` ↔ `수령` 전환
- 두 QR 모두 자체 nonce를 가지고 독립적으로 회전

## 7. 운영 스태프 스캐너 (`src/routes/staff.tsx`)

동일 파서 사용. 표시 라벨도 `주문` / `수령` 으로 노출(로직은 기존 흐름 유지, 라벨링만 정리).

## 변경 파일 요약

- 수정: `src/lib/confesta/store.ts` (QR 분리, Order 모델, 액션 추가, presenterNonces 구조)
- 신규: `src/components/confesta/OrderCard.tsx`
- 수정: `src/routes/audience.tsx` (주문 탭 재구성, My 콘 스캐너 = 수령 전용)
- 수정: `src/components/confesta/SessionCard.tsx` (좌석/신청 UI 제거)
- 수정: `src/routes/presenter.tsx` 및 발표자 QR 렌더링 (두 QR 노출)
- 수정: `src/routes/staff.tsx` (라벨 정리)

## 호환성

- 구버전 `confesta:attend:...` QR은 더 이상 생성되지 않으며 스캔 시 "유효하지 않은 QR"로 처리.
- persisted 상태에 `orders` 미존재 시 빈 배열로 hydrate — 별도 버전 키 변경 불필요.
