## 목표

역할별 사용 환경에 맞춰 각 뷰의 레이아웃·기본값·디바이스 힌트를 정리합니다. 데이터/기능 변경 없음, 표현 레이어만 손봅니다.

| 역할 | 사용 환경 | 기본 방향 |
|---|---|---|
| 청중 | 모바일 전용 | 모바일 폭 고정, 데스크톱에서도 폰 프레임처럼 보임 |
| 운영 스태프 | 모바일 전용 | 동일 |
| 발표자 | PC 위주 | 무대 모드를 기본, 핸드헬드는 보조 |
| 관리자 | PC 위주 | 와이드 벤토 그리드, 좁은 화면엔 안내 배너 |

## 공용: DeviceFrame 컴포넌트 (신규)

`src/components/confesta/DeviceFrame.tsx`
- `<DeviceFrame device="mobile" | "desktop">{children}</DeviceFrame>`
- `device="mobile"`: 데스크톱 뷰포트(>= md)에서는 `max-w-[420px]` + 좌우 그라데이션 캔버스 + 라운드 코너·섀도로 **폰 목업** 안에 자식을 가둠. 모바일 뷰포트에서는 그냥 풀폭(`max-w-none`)으로 패스스루.
- `device="desktop"`: 모바일 뷰포트(< lg)일 때 상단에 "데스크톱 화면에 최적화되어 있어요" 노란 배너 1개를 띄움. 그 외에는 패스스루.

상단 배너/프레임은 `RoleHeader` 아래, 콘텐츠 영역 위에 삽입.

## 라우트별 변경

### `src/routes/audience.tsx` — 모바일 전용
- 최상위 콘텐츠를 `<DeviceFrame device="mobile">`로 감쌈.
- 내부 `max-w-5xl mx-auto` → `max-w-none` (프레임이 폭을 제한).
- `explore` 섹션의 세션 그리드 `sm:grid-cols-2 lg:grid-cols-3` → `grid-cols-1`만.
- `live` 섹션 `md:grid-cols-2` → `grid-cols-1` (콘 카드 위, 스캔 CTA 아래로 세로 배치).
- `PillTabs`가 좁은 폭에서 줄바꿈 없이 흐르도록 `overflow-x-auto` 래퍼 추가.

### `src/routes/staff.tsx` — 모바일 전용
- `<DeviceFrame device="mobile">`로 감쌈.
- 기존 `max-w-md mx-auto`는 유지(프레임 내부에서도 자연스러움).
- 결과 오버레이는 그대로 — 이미 모달이라 OK.

### `src/routes/presenter.tsx` — PC 위주
- 검색 파라미터 `mode` 미지정일 때 **기본값을 `"stage"`로 변경** (현재는 `"handheld"`).
- 좁은 뷰포트(< lg)에서 무대 모드 진입 시 `<DeviceFrame device="desktop">`의 안내 배너 노출.
- 무대 모드 그리드 `lg:grid-cols-5`는 유지, 큰 화면 패딩을 약간 키움(`xl:px-10`).
- 핸드헬드 모드는 그대로 보조 옵션으로 유지(모드 토글로 접근).

### `src/routes/admin.tsx` — PC 위주
- 최상위에 `<DeviceFrame device="desktop">` 적용(안내 배너만 추가).
- 벤토 그리드 `md:grid-cols-2 xl:grid-cols-3` → `md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`.
- 컨테이너 `max-w-7xl` → `max-w-[1400px]`.
- 합계 카드 row도 lg 이상에서 폰트/패딩을 키움.

### `src/routes/index.tsx` — 역할 카드에 디바이스 뱃지
- 각 역할에 `device: "mobile" | "desktop"` 추가하고 `ScoopCard`에 작은 칩으로 표시(예: 📱 모바일 / 🖥 데스크톱). 카드 구조는 그대로, 텍스트만 한 줄 추가.

## 변경 파일 요약

- 신규: `src/components/confesta/DeviceFrame.tsx`
- 수정: `src/routes/audience.tsx`, `src/routes/staff.tsx`, `src/routes/presenter.tsx`, `src/routes/admin.tsx`, `src/routes/index.tsx`, `src/components/confesta/ScoopCard.tsx`(디바이스 칩 prop만 추가)

## 검증

- 데스크톱(1440)에서 청중/스태프가 폰 프레임 안에 들어오는지.
- 모바일(390)에서 발표자/관리자에 안내 배너가 뜨는지.
- 발표자 첫 진입 URL `/presenter`에서 무대 모드가 바로 뜨는지.
- 빌드 통과 + 콘솔 에러 없음.

## 범위 외

- 데이터/상태/QR 로직 변경 없음. 텍스트 카피·아이콘 외 새 색 토큰 추가 없음.
