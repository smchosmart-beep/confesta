# Confesta (콘페스타) — 디자인 시스템

> Baskin Robbins 영감의 달콤한 컨퍼런스 UI

---

## 1. 디자인 철학

- **Vanilla Cream Base**: 모든 화면의 배경은 부드러운 바닐라 크림 톤
- **Scoop Flavor Accents**: 5가지 아이스크림 맛을 기능/역할별 색상 키로 사용
- **Soft & Playful**: 둥근 모서리, 부드러운 그림자, 탄성 있는 인터랙션
- **Gradient-First**: 단색 대신 그라데이션을 기본 채우기로 사용

---

## 2. 색상 시스템

### 2.1 기본 토큰 (oklch)

| 토큰 | 역할 |
|---|---|
| `--background` | 바닐라 크림 베이스 |
| `--foreground` | 진한 초콜릿 텍스트 |
| `--primary` | BR Pink (#FF007A) — 핵심 액션 |
| `--secondary` | BR Blue (#00A2FF) — 보조 강조 |
| `--muted` | 은은한 배경 |
| `--muted-foreground` | 보조 텍스트 |
| `--success` | 민트 계열 성공 |
| `--destructive` | 딸기 계열 경고/오류 |

### 2.2 스쿱 맛 토큰 (Scoop Flavors)

| 맛 | CSS 변수 | HEX 근사 | 사용처 |
|---|---|---|---|
| Mint | `--scoop-mint` | #A3E5D8 | AI×수학 카테고리 |
| Strawberry | `--scoop-strawberry` | #FFAEC9 | 교수법 카테고리, 청중 뷰 |
| Mango | `--scoop-mango` | #FFD27F | 연구사례 카테고리, 관리자 뷰 |
| Blueberry | `--scoop-blueberry` | #B5B9FF | 에듀테크 카테고리, 발표자 뷰 |
| Chocolate | `--scoop-chocolate` | #8B5E3C | 정책 카테고리 |
| Cone | `--cone` | #C4945E | 와플 콘 기본색 |

---

## 3. 그라데이션 유틸리티

모든 주요 표면은 그라데이션으로 채운다.

| 유틸리티 | 각도 | 색상 흐름 | 용도 |
|---|---|---|---|
| `bg-grad-strawberry` | 135deg | #FFC1D8 → #FF4D9D → #FF007A | 청중 CTA, 핀 버튼 |
| `bg-grad-mint` | 135deg | #DCFBF1 → #7EE0C8 → #2FB99A | 성공 상태 |
| `bg-grad-mango` | 135deg | #FFE9B5 → #FFB85C → #FF8A1F | 관리자 카드 |
| `bg-grad-blueberry` | 135deg | #DCDEFF → #8A91FF → #4B53E0 | 발표자 카드 |
| `bg-grad-sunset` | 135deg | #FFD27F → #FF7AB6 → #6B73FF | 히어로 텍스트, 대시보드 |
| `bg-grad-aurora` | 135deg | #7EE0C8 → #8A91FF → #FF7AB6 | 배경 장식 |
| `bg-grad-success` | 135deg | #BDF2C9 → #4FD377 → #1F9F4A | 피드백 성공 |
| `bg-grad-danger` | 135deg | #FFC4B5 → #FF7AB6 → #D8341A | 피드백 오류 |

**소프트 변형** (배경 오버레이용): `bg-grad-sunset-soft`, `bg-grad-aurora-soft` — 동일 색상에 투명도 25-35% 적용

---

## 4. 타이포그래피

| 용도 | 폰트 | 특성 |
|---|---|---|
| 전체 | Pretendard | 가변 웨이트, 시스템 폰트 폴백 |
| 제목 | Pretendard | `letter-spacing: -0.01em` |

**스케일**

- 히어로: `text-5xl sm:text-6xl` (extrabold)
- 섹션 제목: `text-2xl` (extrabold)
- 카드 제목: `text-lg` (bold)
- 본문: `text-base sm:text-lg`
- 캡션/라벨: `text-xs` (semibold, uppercase tracking-wider)

---

## 5. 모양 & 여백

| 속성 | 값 | 설명 |
|---|---|---|
| 기본 radius | `1.25rem` | 전역 `--radius` |
| 카드 radius | `rounded-3xl` | `calc(var(--radius) + 12px)` |
| 버튼/탭 radius | `rounded-full` | 완전한 둥근 모서리 |
| 카드 내부 패딩 | `p-6` | 1.5rem |
| 섹션 가로 패딩 | `px-4 sm:px-6` | 모바일 최적화 |
| 최대 콘텐츠 폭 | `max-w-5xl` / `max-w-6xl` | 중앙 정렬 |

---

## 6. 그림자

| 유틸리티 | 값 | 용도 |
|---|---|---|
| `shadow-pink` | `0 10px 30px rgba(255,0,122,0.18)` | 핑크 CTA 카드 |
| `shadow-blue` | `0 10px 30px rgba(0,162,255,0.18)` | 블루 카드 |
| `shadow-cream` | `0 6px 20px rgba(120,80,40,0.08)` | 기본 카드 |
| `shadow-soft-glow` | `0 14px 40px rgba(255,122,182,0.22)` | 강조 요소 |

---

## 7. 모션 & 애니메이션

| 이름 | 지속시간 | 용도 |
|---|---|---|
| `scoopDrop` | 0.55s | 스쿱이 콘에 떨어지는 탄성 애니메이션 |
| `toppingFly` | 1.4s | 토핑 전송 시 위로 날아가는 효과 |
| `shake` | 0.5s | 오류/거부 피드백 |
| `pulseRing` | 1.8s 무한 | QR 스캔 가이드 링 |
| `floatTopping` | 6s 무한 | 배경 장식 토핑 둥둥 떠다님 |
| `shimmer` | 14s 무한 | 그라데이션 텍스트 빛남 |

**인터랙션 유틸리티**: `bounce-press`
- Hover: `scale(1.03)`
- Active: `scale(0.97)`
- Easing: `cubic-bezier(0.175, 0.885, 0.32, 1.275)`

---

## 8. 컴포넌트 패턴

### 8.1 카드 (Card)

```
relative overflow-hidden
bg-card rounded-3xl p-6
shadow-cream border border-white/60
```

- 내부에 `absolute inset-0 bg-grad-{theme}-soft opacity-50`으로 테마색 오버레이
- 콘텐츠는 `relative`로 위에 렌더링

### 8.2 알약 탭 (PillTabs)

```
inline-flex flex-wrap gap-1 p-1
bg-muted rounded-full shadow-cream
```

- 활성: `bg-primary text-primary-foreground shadow-pink`
- 비활성: `text-foreground/70`

### 8.3 역할 헤더 (RoleHeader)

역할별 색상으로 상단 헤더바 구성. 청중=Pink, 발표자=Blueberry, 스태프=Mint, 관리자=Mango

### 8.4 질문 카드 (Question Card)

```
border-2 rounded-2xl p-4 shadow-cream
```

- 핀됨: `border-transparent bg-grad-sunset-soft`
- 답변완료: `opacity-60 line-through`

### 8.5 스쿱 카드 (ScoopCard)

홈의 역할 선택처럼 "맛으로 분류되는" 내비게이션 카드. 일반적인 직사각형 카드 대신 **아이스크림 스쿱 윗부분(돔) 실루엣**으로 렌더링한다.

**형태**
- 윗면: 매끈한 반원 돔 — 큐빅 베지어로 그린 부드러운 곡선
- 아랫면: 4~5개의 부드러운 물결(scalloped) 모서리 — 스쿱이 살짝 흘러내린 듯한 느낌
- 와플콘 실루엣은 포함하지 않음 (스쿱 위쪽만)

**구현**
- SVG `<clipPath clipPathUnits="objectBoundingBox">`로 카드 컨테이너(`aspect-[4/3]`)를 마스킹
- 동일한 실루엣 그림자는 부모 `<Link>`에 `filter: drop-shadow(...)`로 부여 (`clipPath`가 `box-shadow`를 잘라먹기 때문)
- 채움: `bg-grad-{flavor}` 전면 + 좌상단 `radial-gradient` 하이라이트로 입체감
- 토핑 데코는 `ToppingScatter`로 클립 내부에 흩뿌림

**색 매핑 (역할)**
- 청중 → `strawberry`, 발표자 → `blueberry`, 스태프 → `mint`, 관리자 → `mango`

**내부 요소**
- 중앙 정렬 콘텐츠: 아이콘 배지(`w-14 h-14 rounded-full bg-white/80 ring-2 ring-white`) → 라벨 → 한글명(`text-2xl font-extrabold text-white drop-shadow`) → 한 줄 설명
- 텍스트는 모두 흰색 + `drop-shadow`로 그라데이션 위 가독성 확보

**사용처**: 홈 역할 선택 카드, 향후 카테고리 선택 카드 등 "1개 = 1스쿱" 메타포가 어울리는 곳

---


## 9. 아이콘그래피

- **라이브러리**: Lucide React
- **크기 규칙**: 카드 내부 `w-3.5 h-3.5`, 섹션 아이콘 `w-4 h-4`, CTA 아이콘 `w-7 h-7` / `w-8 h-8`
- **역할 아이콘**:
  - 청중: `IceCream`
  - 발표자: `Mic`
  - 스태프: `ScanLine`
  - 관리자: `LayoutGrid`

---

## 10. 반응형

| 브레이크포인트 | 주요 변화 |
|---|---|
| 기본 (mobile) | 단열 그리드, `px-4`, 탭 아이콘+라벨 |
| `sm` (640px+) | `px-6`, 히어로 폰트 확대 |
| `md` (768px+) | 2열 그리드 시작 |
| `lg` (1024px+) | 3열 세션 그리드 |

---

## 11. 접근성

- `prefers-reduced-motion: reduce` 시 `float-topping` 및 `bg-grad-sunset-anim` 애니메이션 비활성화
- 모든 인터랙션 요소에 `aria-label` 제공
- 색상 대비: oklch 기반으로 명암비 확보
