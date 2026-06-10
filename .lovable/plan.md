## 문제
`IceCreamCone` 컴포넌트 내부에서 각 스쿱 돔 안쪽에 `ToppingScatter`(떠다니는 토핑 데코)가 렌더링되고 있어서, 영수증 탭의 아이스크림 스쿱 표면에도 토핑 애니메이션이 그대로 남아 보입니다.

## 변경
- `src/components/confesta/IceCreamCone.tsx`
  - 스쿱 렌더링 블록 내부의 `<ToppingScatter density="low" seed={...} />` (스쿱 돔 마스크 안쪽 레이어) 제거
  - 더 이상 사용하지 않는 `ToppingScatter` import 제거
- 결과: 스쿱 표면은 그라디언트·하이라이트·그림자만 남아 깔끔해지고, 맨 위 스쿱 위의 토핑(체리 / 스프링클 / 초코칩+민트) 데코는 그대로 유지

영수증 탭의 배경 토핑은 이미 제거된 상태이고, My콘 탭도 같은 컴포넌트를 쓰므로 동일하게 정리됩니다.
