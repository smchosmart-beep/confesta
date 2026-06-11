## 원인

`ToppingTubScene` 내부 `IceCreamTub` SVG는 그라데이션·필터 id에 `sessionId`를 그대로 끼워 넣고 있습니다.

```tsx
<linearGradient id={`tub-body-${sessionId}`} ... />
<path fill={`url(#tub-body-${sessionId})`} ... />
```

그런데 `sessionId = makeSlotKey(day, period, room)` → 예: `Day1|1000|A` 처럼 **`|` 문자**가 포함됩니다.

- `|`는 IRI fragment 규격상 유효하지 않은 문자라, 브라우저(특히 Chromium)는 `url(#tub-body-Day1|1000|A)` 참조를 **해석하지 못하고 fallback인 black으로 칠합니다**.
- 그래서 그라데이션을 쓰는 스쿱 3개(딸기·민트·망고), 통 본체, 라벨 밴드까지 모두 검은색이 되고, 직접 색을 지정한 흰색 림/하이라이트 스트로크만 정상 표시됩니다.
- 시간대 코드를 `am/pm → 1000/1320/1530`로 바꾸기 전에도 `|`는 들어 있었지만, 이번 슬롯 재발급 과정에서 이 화면을 처음 본 것으로 추정됩니다(이전엔 잠금 해제된 슬롯이 없어 본 적이 없었음).

## 수정안

`sessionId`를 SVG id에 직접 쓰지 않고, React `useId()`로 컴포넌트 인스턴스별 고유·안전한 접미사를 만들어 사용합니다. `useId()`가 돌려주는 문자열에는 `:` 같은 문자가 포함될 수 있으므로 한 번 더 정제(`replace(/[^a-zA-Z0-9_-]/g, "")`)한 값을 사용합니다.

### 변경 파일: `src/components/confesta/ToppingTubScene.tsx`

1. `import { useEffect, useMemo, useState, useId } from "react";`
2. `IceCreamTub` 컴포넌트에서:
   - `const rawId = useId(); const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");`
   - 기존 `${sessionId}` 자리 5곳(그라데이션 3개 + 라벨 그라데이션 + 필터 1개의 정의/참조)을 모두 `${uid}`로 교체.
   - `sessionId` prop은 더 이상 SVG id 계산에 쓰지 않으므로 prop 자체를 제거(상위 호출부도 정리).
3. `ToppingTubScene`의 `<IceCreamTub compact={compact} sessionId={sessionId} />` → `<IceCreamTub compact={compact} />`로 단순화.

존재하지 않는 `url(#shimmer-overlay)` 참조는 `opacity="0.0"`이라 시각 영향 없으므로 이번 작업에서는 그대로 둡니다(별도 정리 시점에 제거).

## 영향 범위

- 발표자 화면(`/presenter`)의 토핑 파인트/스테이지 뷰 시각만 영향. 데이터/이벤트/QR/주문 로직과 무관.
- 다른 컴포넌트(`ToppingWordCloud`, `OrderCard` 등)는 손대지 않음.
- 검증: 빌드 후 `/presenter`에서 슬롯 잠금 해제 → 파인트 스쿱/통 본체/라벨이 그라데이션 색으로 렌더되는지 스크린샷으로 확인.
