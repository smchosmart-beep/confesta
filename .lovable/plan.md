## 진단

현재 `IceCreamCone`의 와플콘은 SVG `<defs>` 안의 `linearGradient`/`pattern`을 `fill="url(#cone-grad)"` 로 참조하는 구조입니다. 영수증 카드는 `overflow-hidden` 안에서 `<IceCreamCone size=150>` 을 렌더하는데, 화면에서 콘이 사라진 원인은 다음 둘 중 하나입니다.

1. 위쪽 스쿱들이 z-index 우위(10+ vs 5)로 콘 자리를 덮음 — 스쿱 사각형(transparent mask 바깥)이 콘 위에 올라와도 보일 줄 알았지만, 실제로는 같은 컨테이너 내 음영/필터 스택 때문에 시각적으로 가려짐.
2. SVG 내부 gradient id(`cone-grad`, `cone-rim`, `waffle`)가 같은 페이지에 여러 인스턴스가 동시에 마운트될 때(영수증 본체 + 샘플 영수증 등) 충돌해 fill이 비어버림.

두 위험을 한 번에 없애려면 SVG + url() 참조 방식을 버리고 **순수 div + clip-path + CSS 그라데이션**으로 콘을 그리고, 컨테이너 높이/스쿱 위치를 콘이 항상 보이도록 보정합니다.

## 변경 내용

`src/components/confesta/IceCreamCone.tsx`

1. 콘을 SVG가 아닌 div로 교체:
   - 컨테이너: `position: absolute`, `bottom: 0`, `left: 50%`, `translateX(-50%)`, 폭 `coneW`, 높이 `coneH`, `zIndex: 5`.
   - 본체 div: `clip-path: polygon(0% 6%, 100% 6%, 50% 100%)`, 배경 `linear-gradient(180deg, #EBC18A 0%, #B07B3F 60%, #6E4416 100%)`.
   - 와플 패턴: 본체 위에 같은 clip-path를 가진 div, 배경 `repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.18) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, rgba(0,0,0,0.18) 6px 7px)`.
   - 림(rim): 상단 가로 div, 폭 100%, 높이 `coneH * 0.08`, `linear-gradient(180deg, #F4D9A8, #B07B3F)`, `border-radius: 6px`, 위치 `top: 0`.

2. 높이/위치 보정:
   - `coneH = coneW * 0.95` 로 살짝 키워 콘이 명확히 보이도록.
   - `coneTuck = coneH * 0.12` — 맨 아래 스쿱이 콘 림에 살짝 박히는 정도.
   - `totalHeight = domeVisible * count + (coneH - coneTuck) + domeBox * 0.04`.
   - 각 스쿱 `bottom = (coneH - coneTuck) - domeBox * 0.5 + i * domeVisible` (기존과 동일 로직, 새 `coneH` 기준 자동 보정).

3. z-index 정리:
   - 콘: 5
   - 스쿱: 10 + i (위쪽이 더 큼)
   - 스쿱 마스크 박스 자체는 그대로 — transparent 영역에선 자연스럽게 콘이 비쳐 보임.

4. 빈 상태 안내 점선 원형의 `bottom` 값도 새 `coneH - coneTuck` 기준으로 갱신.

영수증/샘플 영수증 둘 다 동일 컴포넌트라 자동 반영됩니다. 적용 후 `/audience` 영수증 탭 모바일 뷰포트에서 콘이 보이고 맨 아래 스쿱과 자연스럽게 겹치는지 스크린샷으로 확인합니다.
