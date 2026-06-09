
# Confesta (콘페스타) — 프론트엔드 구축 계획

Baskin Robbins 영감의 게이미피케이션 컨퍼런스 플랫폼. 이번 단계는 **프론트엔드 + mock 데이터**만 구현하고, 실제 카메라 QR 스캔은 라이브러리로 동작시킵니다. UI는 한국어 우선.

## 1. 디자인 시스템 (src/styles.css)

`@theme inline` + `:root`에 oklch 토큰 등록:
- `--background` 바닐라크림 `#FDFBF7`
- `--primary` BR 핑크 `#FF007A` / `--secondary` BR 블루 `#00A2FF`
- 스쿱 플레이버 토큰 5종: `--scoop-mint`, `--scoop-strawberry`, `--scoop-mango`, `--scoop-blueberry`, `--scoop-chocolate`
- `--radius: 1.25rem`, pill용 유틸 `rounded-full`
- `--shadow-soft-pink`, `--shadow-soft-blue` (컬러드 앰비언트 섀도우)
- 바운시 transition 유틸 `.bounce-in` (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`)
- `@keyframes scoopDrop` (낙하 + scaleY(0.9) 압축)
- `@keyframes toppingFly` (위로 슬라이드 + 가로 드리프트)
- Pretendard 폰트 로드 (한국어 우선, `<link>` __root.tsx에)

## 2. 라우팅 구조 (src/routes/)

- `index.tsx` — 홈: 4개 역할 카드 (Audience/Presenter/Staff/Admin) — 클릭 시 해당 경로로 이동. 데모 안내 배너.
- `audience.tsx` — 청중 뷰 (탭으로 4섹션 전환: 세션탐색 / 라이브HUD / 토핑전송 / 디지털영수증)
- `presenter.tsx` — 발표자 뷰 (좌: QR 브로드캐스터, 우: 질문 그리드)
- `staff.tsx` — 스태프 뷰 (카메라 스캐너 + 검증 결과 오버레이)
- `admin.tsx` — 관리자 대시보드 (벤토 그리드 + 깔때기 지표)

각 라우트는 고유한 `head()` 메타 (title/description/og).

## 3. 공통 컴포넌트 (src/components/confesta/)

- `IceCreamCone.tsx` — SVG 콘 + 최대 3개 스쿱 스택 (props: scoops 배열, 색상 토큰 매핑)
- `ScoopDropAnimation.tsx` — `@keyframes scoopDrop` 적용 래퍼
- `SessionCard.tsx` — 카테고리 배지 / 제목 / 발표자 / 시간 / 좌석 게이지 / Enroll pill 버튼 (토글)
- `PillTabs.tsx` — Day1/Day2 등 둥근 탭 셀렉터
- `ToppingInput.tsx` — 입력 후 sprinkle 아이콘이 toppingFly로 날아가는 연출
- `ReceiptCard.tsx` — 세로 영수증 (지그재그 하단 보더), 바코드/QR (`react-qr-code`), 상태 배지
- `QRBroadcaster.tsx` — 15초 갱신 QR + 프로그레스 바 (파랑→핑크)
- `MasonryFeed.tsx` — 캔디 카드 자동 스크롤 그리드
- `CameraScanner.tsx` — `@yudiel/react-qr-scanner` 라이브러리 (실제 카메라), 수동 입력 폴백, 가이드 박스 오버레이
- `BentoVenueGrid.tsx` — 룸별 카드 + 깔때기 (등록→출석→수령) 다층 프로그레스

## 4. Mock 데이터 + 로컬 상태 (src/lib/confesta/)

- `mockData.ts` — 세션 목록 (Day1/Day2, 카테고리·색상·발표자·정원), 룸 목록, 질문 샘플
- `useConfestaState.ts` — Zustand 또는 `useState` + Context: enrolled 세션, 스택된 스쿱, 전송된 토핑, 영수증 상태, 스태프 검증 로그
  - 상태는 `localStorage`에 영속화하여 새로고침 후에도 데모 흐름 유지
- 가짜 QR 페이로드 규약: `confesta:{sessionId}:{nonce}` — 발표자 뷰가 15초마다 새 nonce 발급, 청중 스캔 시 검증 → 스쿱 추가

## 5. 패키지 추가

- `@yudiel/react-qr-scanner` (카메라 스캐너)
- `react-qr-code` (영수증 QR / 발표자 QR 렌더)
- `zustand` (전역 상태 — 4개 뷰 간 데모 연동용)

## 6. 인터랙션 흐름 (데모 시나리오)

1. `/presenter`를 한 탭에서 열어두면 15초마다 QR 갱신.
2. 다른 탭/기기에서 `/audience` 열고 카메라 스캐너로 그 QR을 찍으면 → 스쿱이 콘에 떨어짐 (최대 3개).
3. 토핑 입력 → sprinkle 애니메이션 (presenter의 질문 그리드에도 등장, zustand로 동기화).
4. 3스쿱 완성되면 디지털 영수증 활성화 (QR 토큰 생성).
5. `/staff`에서 그 영수증 QR을 스캔 → 성공/중복 사용 오버레이.
6. `/admin` 벤토 그리드에 등록/출석/수령 카운터 실시간 반영.

## 7. 검증

- 각 라우트 빌드 통과 확인.
- 모바일 뷰포트(`/audience`, `/staff`)에서 카메라 컴포넌트 레이아웃 점검.
- 4개 뷰 간 zustand 상태 연동 동작 확인 (같은 브라우저 내 다중 탭).

## 8. 범위 외 (이번 단계 X)

- 실제 인증 / 사용자 계정
- DB 영속화 (다음 단계에서 Lovable Cloud로)
- 실제 다중 기기 실시간 동기화 (현재는 localStorage + 동일 브라우저 한정)

승인하시면 바로 구축 시작하겠습니다.
