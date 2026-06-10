## 변경 범위
`src/components/confesta/ToppingTubScene.tsx`의 `IceCreamTub` SVG에서 **마운드(스쿱) 부분만** 선택된 직선 v2(겹친 둥근 스쿱) 형태로 교체합니다. 통 본체·라벨·단어 토핑 캡슐·낙하 애니메이션은 모두 그대로 유지.

## 마운드 구조 (선택된 v2 그대로 이식)

세 개의 둥근 스쿱을 통 림 위에 살짝 겹쳐 얹는 구성. 각 스쿱은 위→아래 선형 그라데이션 + inner-soft SVG 필터로 부드러운 입체감, 윗면에 흰색 곡선 하이라이트 1개.

- **왼쪽: 민트** — `#B2F5EA → #4FD1C5` (또는 기존 `--gradient-mint` 매핑)
- **오른쪽: 망고** — `#FFE082 → #F6AD55` (또는 `--gradient-mango`)
- **중앙(앞): 스트로베리, 가장 큼** — `#FFB6C1 → #FF6B95` (또는 `--gradient-strawberry`)

세 스쿱은 베이스 라인이 통 림(rim) 안쪽으로 약 6–10px 내려와 통 위에 "얹힌" 느낌. 중앙 스쿱이 양쪽을 가리며 z-order 최상위.

## SVG 디테일

- 뷰박스는 기존 `0 0 400 280` 유지. 마운드 영역은 y≈20~115 사이를 사용.
- `<defs>`에 `linearGradient` 3개(스트로베리/민트/망고) + `<filter id="mound-soft">` 1개(inner highlight). id는 sessionId 접미사로 충돌 방지.
- 각 스쿱은 `Q` 곡선 1쌍으로 둥근 돔. 흰색 하이라이트는 `stroke="white" opacity="0.4~0.5"` 짧은 곡선.
- 기존 바닐라/스트로베리/민트 path 3개는 제거하고 새 path 3개로 교체. 림(`ellipse`)·바디·라벨 path는 그대로 유지.

## 토큰 사용

프로토타입의 hex는 기존 디자인 토큰(`--gradient-strawberry/-mint/-mango`)과 같은 계열이라, SVG 그라데이션 stop 색만 토큰 변형값에 맞춰 hex로 인라인(SVG 안에서는 CSS 변수 사용 불가). 새 색상 토큰 추가 없음.

## 검증

- 빌드 통과 확인.
- 핸드헬드(워드 탭) + 무대 모드 양쪽 렌더 차이 없는지 확인. compact 모드에서도 동일 SVG가 잘 보이는지(이미 viewBox 스케일링이라 OK).
