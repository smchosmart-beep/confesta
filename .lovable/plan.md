## 문제

`IceCreamCone`의 스쿱 마스크는 정사각형의 위쪽 절반만 보이는 돔이라, 현재 `marginTop: -domeW * 0.52` 정도의 음수 마진으로는 스쿱끼리 그리고 스쿱과 콘 사이에 큰 빈 공간이 생긴다. 화면에서도 스쿱끼리, 스쿱-콘이 분리되어 떠 있다.

## 해결 방침

`flex-col-reverse` + margin 방식 대신 **절대 위치(top px 계산)** 로 모든 요소를 쌓는다. 돔의 시각적 높이는 정사각형의 약 0.52배(SVG의 `M3,52 Q50,79 97,52` 기준)이므로 이 값을 기준으로 스쿱 간 간격과 콘 위치를 계산한다.

### 레이아웃 규칙

- 컨테이너: `position: relative`, 너비 `w`, 높이 = `domeVisible * scoops.length + coneH * 0.92`
- 각 스쿱(아래→위, i=0이 맨 아래):
  - `position: absolute`, `left: 50%`, `transform: translateX(-50%)`
  - `bottom = coneTuck + i * domeVisible` (여기서 `domeVisible ≈ domeW * 0.5`)
  - `zIndex = i + 10` (위쪽 스쿱이 앞)
- 콘:
  - `position: absolute`, `bottom: 0`, 중앙 정렬
  - 너비 `w * 0.78`, 시각적으로 맨 아래 스쿱 돔의 평평한 밑선과 콘 상단 림이 살짝 겹치도록 `coneTuck`(약 `coneW * 0.08`)만큼 스쿱들을 위로 올림
  - `zIndex: 5` (맨 아래 스쿱보다 뒤, 윗 스쿱들보단 뒤)

### 빈 상태

스쿱이 없을 때는 기존의 점선 원형 안내를 컨테이너 중앙(콘 위)에 절대 위치로 배치.

### 부수 정리

- 사이즈 변경 시 자동 비례하도록 모든 값은 `w` 기반 계산.
- 영수증/샘플 영수증 모두 동일 컴포넌트를 쓰므로 양쪽 모두 자동 반영.

## 변경 파일

- `src/components/confesta/IceCreamCone.tsx` — 위 레이아웃으로 리팩터링 (스쿱 마스크/쉐이딩 스타일 자체는 유지).

런타임 하이드레이션 경고(audience의 시간 표시)는 이 작업과 무관하므로 이번 플랜에는 포함하지 않습니다.
