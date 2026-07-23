#### 문제
- 청중이 주문을 여러 개 한 뒤 토핑 추가 탭에서 세션을 선택할 때, 세션명이 길면 드롭다운 오른쪽이 잘리거나 텍스트가 말 줄임으로 보입니다.
- 기본 SelectTrigger에 `line-clamp-1`과 `whitespace-nowrap`이 적용되어 있어 긴 세션명을 제대로 표시하지 못합니다.

#### 수정 방향
1. `src/lib/confesta/selectStyles.ts`에 세션 선택 전용 스타일 추가 (기존 공용 스타일은 그대로 유지)
   - `sessionSelectTriggerCls`: 줄바꿈 허용, 왼쪽 정렬, 선택값 텍스트에 `block` + `whitespace-normal` + `break-words`를 적용해 기본 `line-clamp-1` 덮어쓰기
   - `sessionSelectItemCls`: 줄바꿈 허용, 왼쪽 정렬, 체크 아이콘 공간은 유지(pr-8)
   - `sessionSelectContentCls`: 모바일 화면을 넘지 않도록 `max-w-[calc(100vw-2rem)]` 추가
2. `src/routes/audience.tsx`의 토핑 추가 탭 세션 선택 Select에 위 신규 스타일 적용
   - `<SelectTrigger className={sessionSelectTriggerCls}>`
   - `<SelectContent className={sessionSelectContentCls}>`
   - `<SelectItem className={sessionSelectItemCls}>`
3. 필요시 `title` 속성으로 긴 세션명 툴팁 제공

#### 검증
- 모바일 뷰포트(예: 375~390px)에서 /audience 토핑 추가 탭 열기
- 주문을 2개 이상 만들어 세션 선택 드롭다운을 열고, 긴 세션명이 줄바꿈되어 드롭박스 오른쪽이 잘리지 않는 스크린샷 확인
- 다른 탭(주문/My콘/영수증)과 기존 Select(presenter/admin)에 영향 없는지 확인

#### 영향 범위
- 수정은 audience.tsx의 세션 선택 드롭다운에만 집중. 기존 presenter/admin Select에는 영향을 주지 않기 위해 별도 클래스를 사용합니다.
- 레이아웃/높이가 유동적으로 늘어날 수 있으므로, 모바일에서 선택한 후 트리거 높이가 2줄로 커져도 주변 요소가 깨지지 않는지 함께 확인합니다.