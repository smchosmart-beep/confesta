## 문제
발표자 페이지(`presenter.tsx`)와 청중 페이지(`audience.tsx`)의 세션 선택이 모두 네이티브 `<select>`라 클릭 시 OS 기본 옵션 박스(직각, 푸른 하이라이트)가 떠 앱의 핑크/크림 톤·둥근 디자인과 안 맞음.

## 해결
shadcn `Select` (Radix Popover 기반)로 4곳 모두 교체. 패널/아이템까지 우리 디자인 토큰으로 스타일링.

### 변경

**1) 공통 스타일 상수**
- `src/lib/confesta/selectStyles.ts` 신규: 트리거/콘텐츠/아이템에 일관 적용할 className 상수 export.
  - `selectTriggerCls`: `rounded-full bg-card/90 border border-white/70 shadow-cream text-sm font-bold h-auto px-4 py-2.5 focus:ring-2 focus:ring-pink-300`
  - `selectContentCls`: `rounded-2xl border border-white/70 bg-card/95 backdrop-blur shadow-cream p-1`
  - `selectItemCls`: `rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer focus:bg-grad-sunset-soft focus:text-pink-700 data-[state=checked]:bg-grad-strawberry data-[state=checked]:text-white`

**2) `src/routes/audience.tsx`**
- 기존 native `<select>` + `▼` span 제거.
- shadcn `Select` 사용: trigger에 활성 세션 제목, `SelectContent`에 `mySessionIds` 매핑. 위 공통 className 적용.

**3) `src/routes/presenter.tsx`**
- 3개 native `<select>`(일자/시간대/세션) 모두 shadcn `Select`로 교체.
- `selectCls`/`selectStyle`/배경 SVG chevron 제거(트리거가 자체 chevron 가짐).
- 시간대 select에서 `disabled` 옵션은 `SelectItem` `disabled` prop으로 전달.

### 영향 없음
- 상태/로직(value, onChange 시맨틱) 동일.
- 다른 화면의 select 사용에는 영향 없음.
