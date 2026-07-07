## 문제

`QuestionStream.tsx`의 탭 라벨 정의(53–61줄)에서 "전체", "핀", "미답변" 탭은 카운트가 붙어 있지만 "답변완료" 탭만 `label: "답변완료"`로 숫자가 빠져 있음. 체크 토글은 정상 동작하고 필터도 정상 작동하지만 라벨에 카운트를 렌더링하지 않아 사용자가 "숫자가 안 올라간다"고 느낌.

## 수정

`src/components/confesta/QuestionStream.tsx` 60번째 줄:

```ts
{ value: "addressed", label: `답변완료 ${toppings.filter((t) => t.addressed).length}` },
```

## 검토

- 다른 로직·서버·DB 영향 없음, 순수 표시 문제.
- `toppings` 배열은 이미 메모되어 있고 filter 한 번 더 도는 정도라 성능 영향 없음.
