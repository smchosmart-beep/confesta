## 문제
`src/routes/presenter.tsx`의 `SlotPickerBar`에서 **세션** Select가 `slotsInScope`(선택된 일자+시간대의 모든 장소) 전체를 나열함. 그래서 스크린샷처럼 401-A를 골라도 다른 장소의 세션까지 다 뜸.

## 수정 (프론트엔드만, 단일 파일)
`src/routes/presenter.tsx` 세션 Select(약 328–350줄)를 아래로 변경:

- `room`이 선택되지 않았으면 disabled + placeholder "장소를 먼저 선택"
- 선택된 경우 `slotsInScope.filter(s => s.room === room)` 결과(최대 1건)만 렌더
- 매칭되는 항목이 없으면 "세션 정보 없음" 표시

동작상 세션 Select는 실질적으로 단일 항목 표시(읽기 전용에 가깝지만 기존 `onChangeRoom` 시그니처 유지)로 바뀜.

## 영향 검토
- 서버 호출/DB/과금 영향 0 (렌더링 필터만).
- 다른 라우트/컴포넌트 무영향 (해당 Select 블록만 수정).
- `장소` Select는 그대로 남아 실제 선택 UI 역할을 계속 수행.
