# '토핑 추가' 탭 오류 수정

## 문제 원인
주문을 한 상태에서 '토핑 추가' 탭을 열면 화면 전체가 "This page didn't load" 오류로 바뀝니다.

콘솔 오류:
```
Error: cannot add `postgres_changes` callbacks for realtime:toppings:1|am|402-A after `subscribe()`
```

원인: 토핑 목록·게이트·키워드질문 훅(`use-toppings`, `use-topping-gate`, `use-answer-prompts`)이 실시간 채널 이름을 `toppings:{세션ID}` 같은 고정 문자열로 만드는데, 토핑 탭에서는 **같은 훅을 여러 컴포넌트가 동시에 사용**합니다 (페이지 본문 + ToppingInput + AnswerPromptCard 등). 백엔드 클라이언트는 같은 이름의 채널을 재사용하기 때문에, 두 번째 컴포넌트가 이미 구독된 채널에 콜백을 추가하려다 예외가 발생하고 React 화면 전체가 깨집니다.

## 수정 내용 (프론트엔드 훅 4곳)
각 훅에서 채널 이름에 마운트별 고유 접미사를 붙여 컴포넌트마다 독립된 채널을 쓰도록 변경합니다.

- `src/hooks/use-toppings.ts` — `toppings:{id}:{고유값}`
- `src/hooks/use-topping-gate.ts` — `gate:{id}:{고유값}`
- `src/hooks/use-answer-prompts.ts` — `prompts:{id}:{고유값}`
- `src/hooks/use-slide-state.ts` — 같은 패턴이면 동일 적용

고유값은 `useId()` 또는 마운트 시 생성한 랜덤 문자열(ref)을 사용합니다. 구독 해제 로직(removeChannel)은 그대로 유지됩니다.

## 검증
1. 주문이 있는 기기 상태를 재현해 '토핑 추가' 탭 진입 → 오류 없이 렌더링 확인
2. 질문 전송·키워드 응답·실시간 갱신 정상 동작 확인
3. 발표자/스태프 화면에서도 동일 훅 사용처 회귀 확인

수정 후 게시(Publish)해야 실제 사이트(confesta.lovable.app)에 반영됩니다.