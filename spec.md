# Confesta (콘페스타) — 제품 스펙

> AI 디지털 컨퍼런스&페스티벌을 위한 게이미피케이션 플랫폼 데모

---

## 1. 개요

Confesta는 컨퍼런스 참여를 아이스크림 한 콘에 담은 게이미피케이션 데모 플랫폼이다. 수강신청부터 출석 인증, 라이브 질문, 디지털 영수증 교환까지 하나의 흐름으로 연결한다.

**핵심 메타포**

- **콘 (Cone)** — 사용자의 컨퍼런스 참여 여정
- **스쿱 (Scoop)** — 세션 출석 증명 (최대 3개 적립)
- **토핑 (Topping)** — 라이브 질문/감상
- **영수증 (Receipt)** — 3스쿱 적립 시 발급되는 디지털 보상 토큰

---

## 2. 사용자 역할

### 2.1 청중 (Audience) — `/audience`

4개 탭으로 구성된 모바일 중심 뷰

| 탭 | 기능 |
|---|---|
| **주문** | Day 1/2 세션 목록, 수강신청 토글 |
| **My 콘** | 적립 스쿱 시각화(아이스크림 콘), QR 스캔 출석 |
| **토핑 추가** | 주문 세션 드롭다운 선택 → 라이브 질문/키워드 응답 전송. 응답 대기 중 예시 미리보기 카드 제공 |
| **영수증** | 3스쿱 달성 시 디지털 영수증 표시 |

**QR 출석 흐름**
1. 발표자 화면의 동적 QR을 카메라로 스캔
2. QR payload: `confesta:attend:{sessionId}:{nonce}`
3. 유효하면 해당 세션의 맛(flavor) 스쿱이 콘에 쌓임
4. 15초마다 nonce 갱신으로 재사용 방지

### 2.2 발표자 (Presenter) — `/presenter`

- 슬라이드 제어 패널 (이전/다음/일시정지)
- 현재 세션의 실시간 질문 그리드 (핀/답변완료/좋아요)
- Spotlight 모달로 특정 질문 확대 표시
- 출석 QR 브로드캐스트 (15초 주기 자동 갱신)

### 2.3 운영 스태프 (Staff) — `/staff`

- 영수증 QR 스캐너
- 토큰 검증: `confesta:receipt:{sessionIds}:{timestamp}`
- 검증 결과 — 성공/중복/무효 3가지 상태

### 2.4 관리자 (Admin) — `/admin`

- 벤토 그리드 형태 운영 현황 대시보드
- 세션별 실시간 출석 깔때기 지표
- 전체 토핑(질문) 통계

---

## 3. 데이터 모델

### 3.1 세션 (Session)

```
id: string
day: 1 | 2
title: string
presenter: string
room: string
timeSlot: string      // "10:00 - 10:50"
category: CategoryKey
capacity: number
```

### 3.2 카테고리 (Category)

```
key: "ai-math" | "edutech" | "pedagogy" | "research" | "policy"
label: string
flavor: ScoopFlavor   // mint | strawberry | mango | blueberry | chocolate
```

### 3.3 토핑 (Topping)

```
id: string
sessionId: string
text: string
createdAt: number
pinned?: boolean
addressed?: boolean
```

### 3.4 적립 스쿱 (StackedScoop)

```
id: string
sessionId: string
flavor: ScoopFlavor
stackedAt: number
```

### 3.5 교환 로그 (RedemptionLog)

```
token: string
redeemedAt: number
status: "success" | "duplicate" | "invalid"
```

---

## 4. 상태 관리

- **라이브러리**: Zustand + persist 미들웨어
- **스토어 이름**: `confesta-state-v2` (localStorage)
- **동기화**: 같은 브라우저 내에서 4개 역할 뷰가 로컬 상태로 실시간 연동

**주요 상태**

- `enrolledSessionIds` — 수강신청한 세션 ID 목록
- `scoops` — 적립된 스쿱 배열 (최대 3개)
- `toppings` — 모든 토핑(질문) 배열
- `presenterNonces` — 세션별 현재 출석 nonce
- `receiptToken` — 생성된 영수증 토큰
- `redemptionLog` — 스태프 교환 검증 이력
- `attendanceCounts` — 세션별 출석 카운트
- `slideIndex` / `slideTotal` / `slidePaused` — 발표자 슬라이드 상태

---

## 5. 핵심 워크플로우

### 5.1 출석 → 스쿱 적립

```
발표자: rotatePresenterNonce() → 15초마다 새 nonce 생성
청중: CameraScanner로 QR 스캔 → addScoopFromQR()
  → 파싱 성공 + 최대 스쿱 미달 + 미출석 세션 → 스쿱 추가
```

### 5.2 토핑(질문) 전송

```
청중: ToppingInput에서 텍스트 입력 → addTopping(sessionId, text)
발표자: QuestionStream에서 실시간 피드 → togglePin / toggleAddressed
```

### 5.3 영수증 발급 → 교환

```
청중: scoops.length === 3 → generateReceipt() → ReceiptCard 표시
스태프: CameraScanner로 영수증 QR 스캔 → redeemReceipt(token)
  → success / duplicate / invalid 상태 반환
```

---

## 6. 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | TanStack Start v1 (Vite 7 + React 19) |
| 스타일링 | Tailwind CSS v4 (네이티브 CSS `@import`, `@theme inline`) |
| 상태 관리 | Zustand |
| 라우팅 | TanStack Router (파일 기반) |
| 아이콘 | Lucide React |
| 폰트 | Pretendard |
| 빌드 타겟 | Edge (Cloudflare Workers) |

---

## 7. 제약사항

- **데모 특성**: 같은 브라우저 탭 간 localStorage 기반 연동. 다중 기기 동기화는 지원하지 않음
- **QR 유효기간**: 출석 QR nonce는 15초 후 무효화 (재사용 방지)
- **스쿱 상한**: 청중당 최대 3개 (영수증 발급 기준)
- **초기 데이터**: 세션/질문 목록은 하드코딩된 목업 데이터 사용
