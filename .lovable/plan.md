## 요약
와플콘이 안 보이는 버그 수정 + 다중 인스턴스 ID 충돌 방지.

## 원인
1. `<g clipPath="url(#coneClip)">`로 사각형들을 삼각형으로 잘라내고 있는데, SVG의 `preserveAspectRatio="none"` + `clipPathUnits="userSpaceOnUse"` 조합에서 클립 영역이 비어 렌더가 사라짐 → 콘 본체가 투명.
2. `coneBody`, `waffleGrid` 등 SVG `id`가 컴포넌트 인스턴스마다 동일 → 영수증 등에서 여러 콘이 동시에 마운트되면 `url(#…)` 참조 충돌.

## 변경
`src/components/confesta/IceCreamCone.tsx`

1. **clipPath 제거**: 각 그라데이션 fill을 사각형 4개로 쌓는 대신, **삼각형 `<polygon points="0,6 100,6 50,100">`을 4번 겹쳐** 각각 `coneBody`, `waffleGrid`, `coneSide`, `coneTip` 채움. clipPath 미사용으로 안정적.
2. **`useId()` 도입**: React `useId()`로 prefix 만들어 `coneBody-{uid}`, `waffleGrid-{uid}` 등 인스턴스별 고유 ID 부여. 모든 `url(#…)` 참조도 동일 prefix 사용.
3. 림(rim) 사각형 3개는 그대로 유지하되 `fill` 참조도 새 ID로.

## 검증
- /audience → My 콘 탭에서 카라멜 와플콘이 보이는지 확인 (스크린샷).
- /audience → 영수증 탭(완료 시) 두 콘이 모두 정상 표시되는지 확인.