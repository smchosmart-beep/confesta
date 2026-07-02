## 원인
직전 수정에서 청중 하트 버튼에 추가한 `onTouchEnd={(e) => e.preventDefault()}`가 모바일에서 터치 후 발생하는 합성(click) 이벤트를 차단합니다. 이 버튼의 실제 동작은 `onClick`에 걸려 있어, 결과적으로 모바일에서 탭해도 아무 반응이 없게 됩니다.

이중 발화 방지는 이미 `use-toppings.ts`의 500ms 쿨다운(`LIKE_COOLDOWN_MS`)이 `mutationFn`/`onMutate` 양쪽에서 처리하고 있으므로, `onTouchEnd` preventDefault는 불필요하고 오히려 유해합니다.

## 수정
`src/routes/audience.tsx`의 하트 버튼(548~554행)에서 `onTouchEnd={(e) => e.preventDefault()}` 한 줄만 삭제합니다. `onClick` 핸들러는 그대로 유지합니다.

## 검증 관점
- 모바일: 탭 1회로 좋아요 토글 정상 동작, 카운트 즉시 반영.
- 연타/더블탭: 500ms 쿨다운이 두 번째 요청을 차단하여 0으로 되돌아가는 이전 버그 재발 없음.
- 데스크톱 클릭: 영향 없음.
- 다른 버튼(핀/체크/삭제): 영향 없음.
