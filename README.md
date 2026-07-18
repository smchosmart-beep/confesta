# Confesta (콘페스타)

> AI 디지털 컨퍼런스&페스티벌을 위한 게이미피케이션 플랫폼

컨퍼런스 참여를 아이스크림 한 콘에 담아, **주문(수강신청) → 출석 수령 → 토핑(질문/응답) → 영수증 발급** 의 흐름을 4개 역할(청중·발표자·스태프·관리자) 화면으로 제공합니다.

---

## 핵심 메타포

- **콘 (Cone)** — 사용자의 컨퍼런스 참여 여정
- **주문 (Order)** — 세션 사전 예약 (주문 QR 스캔)
- **스쿱 (Scoop)** — 세션 출석/수령 증명 (최대 3개 적립, 수령 QR 스캔)
- **토핑 (Topping)** — 라이브 질문 / 키워드 응답
- **영수증 (Receipt)** — 3스쿱 적립 시 발급되는 디지털 보상 토큰

---

## 주요 기능

### 청중 `/audience`
- 주문 QR 카메라 스캔으로 세션 사전 예약 (최대 3건)
- My 콘 화면에서 적립 스쿱 시각화
- 수령 QR 스캔으로 출석 확정 및 스쿱 적립
- 라이브 질문 / 키워드 응답 전송, 좋아요·댓글
- 3스쿱 달성 시 디지털 영수증 발급

### 발표자 `/presenter`
- 슬롯별 비밀번호로 잠금 해제 (쿠키 12시간 유지)
- 주문 QR 표시/인쇄, 수령 QR 15초 자동 회전
- 응답 원형 차트, 워드 클라우드, 라이브 질문 스트림, 스포트라이트 모달

### 스태프 `/staff`
- 영수증 QR 스캐너 (success / duplicate / invalid 판정)

### 관리자 `/admin`
- 일자 × 시간대 × 방 슬롯 그리드
- 행사명 인라인 편집, 주문 QR 발급/재발급/인쇄, 발표자 비밀번호 설정
- 운영 현황 대시보드 (출석 깔때기, 토핑 통계)

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | TanStack Start v1 (Vite 7 + React 19) |
| 라우팅 | TanStack Router (파일 기반, `src/routes/`) |
| 상태 관리 | TanStack Query (서버) + Zustand (UI 로컬) |
| 스타일링 | Tailwind CSS v4 (`@import`, `@theme inline`) |
| UI 컴포넌트 | shadcn/ui, Radix Primitives, Lucide 아이콘 |
| 백엔드 | Lovable Cloud (Postgres + Realtime + Auth + Storage) |
| 서버 로직 | `createServerFn` + 슬롯 쿠키 인증 |
| QR | `react-qr-code` |
| 폰트 | Pretendard |
| 빌드 타겟 | Edge (Cloudflare Workers) |

---

## 시작하기

### 요구사항
- [Bun](https://bun.sh) 1.x

### 설치 및 실행

```bash
bun install
bun run dev          # 개발 서버 (Vite)
bun run build        # 프로덕션 빌드
bun run build:dev    # 개발 모드 빌드
bun run preview      # 빌드 결과 미리보기
bun run lint         # ESLint
bun run format       # Prettier
```

### 환경변수

Lovable Cloud 를 사용하므로 `.env` 의 Supabase URL / Publishable Key / Project ID 는 자동으로 관리됩니다. **수동으로 편집하지 마세요.**

---

## 디렉터리 구조

```
src/
  routes/                     # 파일 기반 라우팅
    __root.tsx                # 앱 셸 (head, 프로바이더)
    index.tsx                 # 랜딩
    audience.tsx              # 청중
    presenter.tsx             # 발표자
    staff.tsx                 # 스태프
    admin.tsx                 # 관리자
    api/public/               # 웹훅·공개 API
  components/confesta/        # 도메인 UI 컴포넌트
  components/ui/              # shadcn/ui
  hooks/                      # 도메인 훅 (use-toppings, use-audience 등)
  lib/confesta/               # 서버 함수 (*.functions.ts) 및 도메인 로직
  integrations/supabase/      # 자동 생성된 Supabase 클라이언트 (편집 금지)
  styles.css                  # Tailwind v4 진입점
```

---

## 배포

Lovable 프로젝트 우측 상단의 **Publish** 로 배포합니다.

- **Preview URL**: 최신 빌드 미리보기
- **Published URL**: 안정 배포 (`https://confesta.lovable.app`)

`/api/public/*` 경로는 인증 없이 외부 콜러(웹훅·크론)가 호출 가능하므로, 반드시 서명/시크릿 검증을 핸들러 안에서 수행합니다.

---

## 문서

- [상세 제품 스펙](./spec.md) — 세션 슬롯 모델, QR 종류, 데이터 모델, 워크플로우
- [디자인 가이드](./design.md) — 컬러/타이포/컴포넌트 톤

---

## 크레딧

Private 프로젝트. Built with [Lovable](https://lovable.dev).
