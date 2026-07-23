주문탭의 안내 문구를 제거하고, My 콘 탭의 콘 비주얼 빈 스쿱 위치로 이동시킨다.

### 1. 변경 대상
- `src/components/confesta/OrderCard.tsx`: 주문탭의 "아직 스쿱이 쌓이지 않았어요..." 안내 블록 삭제
- `src/components/confesta/IceCreamCone.tsx`: My 콘 콘 비주얼의 빈 스쿱 마스크 위 기존 문구 "QR 스캔하면 스쿱이 쌓여요" 자리에 이동된 문구를 배치

### 2. 구현 세부
- `OrderCard.tsx`의 `{!picked && (...)}` 안내 `<div>`를 완전히 제거. 삭제로 인한 레이아웃 붕괴 없이 상위 여백/위치만 조정.
- `IceCreamCone.tsx`의 빈 스쿱(`placeholderCount`) 위 텍스트 영역에서:
  - 기존 `QR 스캔하면 스쿱이 쌓여요` → `아직 스쿱이 쌓이지 않았어요. 수령 QR을 스캔하면 콘에 1스쿱이 적립돼요.`로 교체
  - 텍스트가 길어지므로 줄바꿈/폰트 크기/패딩을 조정하여 원형 마스크 안에 보기 좋게 배치. 예: `text-[10px] leading-tight` → `text-[10px] leading-snug` 또는 `text-xs`로 다운, `px-3` 및 `max-w-[80%]` 적용 검토.
- 두 컴포넌트 모두 변경 후 audience 탭의 레이아웃을 확인하여 좌우 간격과 가독성을 유지.

### 3. 영향도
- 기능/상태: 변경 없음. UI 텍스트 이동만 수행.
- 서버비: 없음.
- 타 기능: OrderCard의 버튼/QR 스캐너 동작 유지. IceCreamCone은 OrderCard와 독립적이므로 ReceiptCard 등 다른 사용처에 영향 없음.

### 4. 검증
- audience 모바일 뷰에서 주문탭 설명 문구 제거 확인.
- My 콘 탭의 빈 콘 위치에 이동된 문구 노출 확인 및 시각적 깨짐 여부 스크린샷 검증.