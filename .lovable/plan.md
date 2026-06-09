
# 그라데이션 + 토핑 데코 전면 적용 계획

전체 디자인 시스템을 **단색 → 그라데이션 + 산발적 토핑 데코**로 업그레이드합니다.

---

## 1. 그라데이션 토큰 (`src/styles.css`)

`@theme inline` 에 그라데이션 변수 8종 정의 — 모든 UI에서 단색 fill 대신 이걸 사용:

```css
--gradient-strawberry: linear-gradient(135deg, #FFAEC9, #FF007A);
--gradient-mint:       linear-gradient(135deg, #C7F4EA, #5BD1B8);
--gradient-mango:      linear-gradient(135deg, #FFE19A, #FFA040);
--gradient-blueberry:  linear-gradient(135deg, #CFD3FF, #6B73FF);
--gradient-chocolate:  linear-gradient(135deg, #C49C7C, #6B3F1F);
--gradient-cream:      linear-gradient(180deg, #FFF8EE, #FDE8D6);
--gradient-sunset:     linear-gradient(135deg, #FFD27F 0%, #FF7AB6 50%, #6B73FF 100%);  /* primary brand gradient */
--gradient-cone:       linear-gradient(180deg, #E3B373, #8A5A2B);
```

대응 유틸리티 (`@utility bg-grad-strawberry { background: var(--gradient-strawberry); }` …) 8개.

추가 유틸:
- `.text-grad-sunset` — `background-clip: text; color: transparent;` 로 헤딩에 그라데이션 텍스트.
- `.border-grad-pink` — 1px 그라데이션 보더 (background-image + mask).
- `.bg-confetti` — 배경에 sprinkle dot 무한 패턴 (radial-gradient).

## 2. 컬러 사용 규칙 전환

- 모든 `bg-primary`, `bg-secondary`, `bg-scoop-*` 사용 자리를 **그라데이션 유틸리티로 치환**.
- 단, 텍스트/아이콘 컬러는 단색 유지 (가독성).
- 카드: `bg-card` → `bg-card relative` + 내부에 토핑 데코 레이어 추가.
- 큰 헤딩(홈, 역할 헤더, 무대 모드 타이틀)은 `.text-grad-sunset`.

대상 파일:
- `src/routes/index.tsx` (홈)
- `src/routes/audience.tsx`, `presenter.tsx`, `staff.tsx`, `admin.tsx`
- `src/components/confesta/RoleHeader.tsx` (아이콘 박스 그라데이션)
- `SessionCard`, `SlideControlPanel`, `PresenterModeToggle`, `PillTabs`, `AttendanceGauge`(이미 그라데이션, 풍성하게), `ToppingInput`, `ReceiptCard`, `IceCreamCone`

## 3. 토핑 데코 시스템 (`src/components/confesta/ToppingDecor.tsx`)

재사용 가능한 SVG 토핑 컴포넌트 모음:

- **`<Sprinkle />`** — 알록달록 막대 (4가지 색상 랜덤, rotate)
- **`<Cherry />`** — 줄기 달린 빨간 체리
- **`<ChocChip />`** — 갈색 칩
- **`<WaferStick />`** — 비스킷 스틱
- **`<StarSprinkle />`** — 별 모양
- **`<Heart />`** — 작은 하트

각각 size/rotate/color prop, 기본은 토큰에서 가져옴.

### 두 가지 사용 모드

(a) **`<ToppingScatter density="low|med|high" />`** — 컨테이너 내부 절대위치로 8~20개 토핑을 시드 기반 의사난수 배치. 카드/섹션에 자식으로 넣으면 데코로 채워짐. `pointer-events: none`, `aria-hidden`. 모션 감소 시 정적.

(b) **`<BackgroundToppings />`** — `<body>` 레벨 고정 배경 레이어. `fixed inset-0 -z-10`, 굵은 토핑 20개 + 천천히 떠다니는 `@keyframes float-topping`.

## 4. 적용 위치

- **`__root.tsx`** — `<BackgroundToppings />` 한 번만 마운트.
- **모든 `bg-card` 카드** — `relative overflow-hidden` 추가 + 우상단/좌하단에 `<ToppingScatter density="low" />`.
- **홈 역할 카드 4개** — 각 카드 그라데이션 + density="med" 토핑.
- **무대 모드 QR 카드** — 큰 체리 1개 + 스프링클 다수 (density="high").
- **영수증 카드** — 지그재그 영역에 작은 토핑 줄지어.
- **헤더 아이콘 박스** — 단색 → 그라데이션.

## 5. 새 키프레임

```css
@keyframes float-topping {
  0%,100% { transform: translateY(0) rotate(var(--r,0deg)); }
  50%     { transform: translateY(-12px) rotate(calc(var(--r,0deg) + 8deg)); }
}
@keyframes shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
```

`.bg-grad-sunset-anim` — sunset 그라데이션이 천천히 좌우 이동 (`background-size: 200% 200%` + `shimmer 12s`).

## 6. 접근성/성능

- 모든 데코 `aria-hidden="true"`, `pointer-events-none`.
- `@media (prefers-reduced-motion: reduce)` 에서 float/shimmer 정지.
- 토핑은 SVG 인라인 (네트워크 비용 0), `<ToppingScatter />` 는 `useMemo` 로 시드 고정 (재렌더 시 위치 안 흔들림).

## 7. 파일 변경 요약

**신규**:
- `src/components/confesta/ToppingDecor.tsx` (SVG 6종 + `ToppingScatter`)
- `src/components/confesta/BackgroundToppings.tsx`

**수정**:
- `src/styles.css` — 그라데이션 토큰/유틸, 새 키프레임
- `src/routes/__root.tsx` — `<BackgroundToppings />` 마운트
- `src/routes/index.tsx`, `audience.tsx`, `presenter.tsx`, `staff.tsx`, `admin.tsx` — 단색 → 그라데이션 클래스 치환, 카드에 ToppingScatter 추가
- `RoleHeader`, `SessionCard`, `SlideControlPanel`, `PresenterModeToggle`, `IceCreamCone`(콘에 그라데이션), `ReceiptCard`, `ToppingInput`, `PillTabs` — 그라데이션 적용

## 8. 범위 외

- 새 기능 추가 없음 (순수 비주얼 업그레이드).
- 다크모드 토큰 재조정은 이번 범위에 포함하되 라이트 우선으로 튜닝.

승인하시면 바로 적용하겠습니다.
