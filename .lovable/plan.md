요청: 토핑 추가 화면의 "질문하기" / "키워드응답" 두 탭을 가로 너비를 모두 차지하도록 크게 만들고, 폰트 크기도 함께 키운다.

현재 상태
- `src/components/confesta/ToppingInput.tsx`의 탭 컨테이너가 `inline-flex self-start`로 되어 있어 콘텐츠 너비만 차지한다.
- 각 탭 버튼은 `px-3 py-1.5 text-xs`로 작게 설정되어 있다.

변경 내용
1. 탭 컨테이너를 `flex w-full`로 변경한다.
2. 각 탭 버튼에 `flex-1 justify-center`를 추가해 두 탭이 동일 너비로 가로 전체를 채운다.
3. 탭 버튼의 폰트 크기를 `text-xs` → `text-sm`으로 키우고, 아이콘 크기를 `w-3.5 h-3.5` → `w-4 h-4`로 키운다.
4. 패딩을 약간 늘려 터치 영역을 확보한다(`px-3 py-1.5` → `px-4 py-2` 정도).
5. 기존 디자인 토큰(`bg-muted`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `shadow-pink`)은 유지한다.

영향 범위
- 이 탭은 `ToppingInput` 컴포넌트 내부에서만 사용되므로 다른 화면에 영향을 주지 않는다.
- 발표자 화면/관리자 화면의 탭은 별도 컴포넌트이므로 변경하지 않는다.

검증 방법
- `bun run build`로 타입/빌드 오류를 확인한다.
- 모바일 뷰포트에서 "토핑 추가" 탭의 "질문하기"/"키워드 응답" 버튼이 좌우로 꽉 차는지 캡처로 확인한다.