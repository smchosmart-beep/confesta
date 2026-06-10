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
- 본체: **거의 완전한 원형** — 큐빅 베지어 4분할로 그린 매끈한 공(스쿱) 모양
- 하단: 본체 바로 아래에 폭의 약 90%, 높이 약 15%의 **얇고 비대칭인 녹은 받침** (2~3개의 작은 물결, 좌우 길이가 미세하게 다름)
- 와플콘 실루엣은 포함하지 않음
- 카드 비율: `aspect-[1/1.05]` (거의 정사각, 살짝 세로로 김), `max-w-[340px]`로 너무 커지지 않게 제한

**구현**
- 알파 채널 PNG(`src/assets/scoop-mask.png.asset.json`, 흰색 실루엣 + 투명 배경)를 CSS `mask-image`로 카드 컨테이너(`aspect-square`)에 적용
- 컨테이너 내부의 그라데이션/하이라이트/토핑/콘텐츠가 마스크된 스쿱 모양으로 잘려 보임
- 부모 `<Link>`에 `filter: drop-shadow(...)`로 동일 실루엣 그림자 부여 (`mask`는 `box-shadow`를 잘라먹기 때문)
- 채움: `bg-grad-{flavor}` 전면 + 좌상단 `radial-gradient` 하이라이트로 입체감
- 토핑 데코는 `ToppingScatter`로 마스크 내부에 흩뿌림
- 스쿱 모양 변경이 필요하면 PNG 마스크 파일만 교체하면 됨

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

- `prefers-reduced-motion: reduce` 시 `float-topping`, `topping-drop`, `bg-grad-sunset-anim` 애니메이션 비활성화
- 모든 인터랙션 요소에 `aria-label` 제공
- 색상 대비: oklch 기반으로 명암비 확보

---

## 12. 폼 컨트롤 — Select (드롭다운)

네이티브 `<select>`는 OS 기본 옵션 박스(직각 모서리·푸른 하이라이트)가 떠 앱 톤과 어긋난다. **모든 세션/카테고리 선택은 shadcn `Select` (Radix Popover)** 로 통일한다.

**공통 className 상수**: `src/lib/confesta/selectStyles.ts`

| 상수 | 적용 위치 | 값 |
|---|---|---|
| `selectTriggerCls` | `<SelectTrigger>` | `rounded-full bg-card/90 border border-white/70 shadow-cream text-sm font-bold h-auto px-4 py-2.5 focus:ring-2 focus:ring-pink-300` |
| `selectContentCls` | `<SelectContent>` | `rounded-2xl border border-white/70 bg-card/95 backdrop-blur shadow-cream p-1` |
| `selectItemCls` | `<SelectItem>` | `rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer focus:bg-grad-sunset-soft focus:text-pink-700 data-[state=checked]:bg-grad-strawberry data-[state=checked]:text-white` |

**규칙**
- 트리거: 알약(`rounded-full`) + 크림 카드 톤 + 자체 chevron (배경 SVG chevron 추가 금지)
- 콘텐츠 패널: `rounded-2xl` + 백드롭 블러 + 크림 그림자
- 항목 hover/focus는 `bg-grad-sunset-soft`, 선택된 항목은 `bg-grad-strawberry` 흰 글자
- `disabled` 옵션은 `SelectItem`의 `disabled` prop 사용 (네이티브 `<option disabled>` 금지)

**적용처 (현재)**
- `routes/audience.tsx` — 청중 화면 "내 세션" 선택 (가로 스크롤 탭 → 드롭다운으로 전환)
- `routes/presenter.tsx` — 발표자 화면 일자/시간대/세션 3개 셀렉터

---

## 13. 미리보기/샘플 카드

빈 상태(아직 응답이 없는 키워드 프롬프트 등)에서 사용자가 "어떻게 보일지" 가늠할 수 있도록 **샘플 미리보기 카드**를 제공한다.

**컴포넌트**: `src/components/confesta/SampleAnswerPromptCard.tsx`

- 빈 상태 영역 아래(`audience.tsx`에서 `sessionPrompts.length === 0`)에 렌더링
- 상단에 "예시 미리보기" 배지 + "진행 중" 상태 배지로 실제 카드와 시각적 구분
- 더미 프롬프트("오늘 가장 인상 깊었던 단어 하나는?") + 6개 샘플 응답(배수판별법, 생성형ai, 프롬프트, 탐구, 수학적사고, 협력) + 파이 차트
- 톤은 실제 응답 카드와 동일한 디자인 토큰 사용 (`bg-card`, `rounded-3xl`, `shadow-cream`)

**원칙**: 미리보기 카드는 항상 실제 카드와 배지로 구분되며, 인터랙션은 데모용으로만 작동(전송/저장 없음).
