## 목표

발표자가 청중의 토핑 입력을 세션별로 제어할 수 있게 한다. 질문과 키워드 응답을 각각 독립적으로 열고 닫을 수 있으며, 응답 모드일 때는 발문 프롬프트를 함께 노출한다.

## 사용자 시나리오

1. 평소: 발표자가 "질문 받기" 토글만 ON. 청중은 질문 탭만 사용 가능, 응답 탭은 비활성.
2. 토론 시점: 발표자가 "키워드 응답 받기" 토글을 ON 하고 발문 입력(예: "오늘 가장 인상 깊은 단어는?"). 청중 응답 탭이 열리고 입력창 위에 발문이 카드로 표시됨.
3. 정리 시점: 발표자가 둘 다 OFF. 청중은 두 탭 모두 비활성 + "발표자가 곧 열어드려요" 안내.

## 데이터 모델

`ConfestaState`에 세션별 토핑 게이트 상태 추가:

```ts
type ToppingGate = {
  questionsOpen: boolean;   // 질문 받기
  answersOpen: boolean;     // 키워드 응답 받기
  answerPrompt: string;     // 발문 (응답 모드 안내 문구)
};
toppingGates: Record<string, ToppingGate>; // sessionId -> gate
```

기본값: `{ questionsOpen: true, answersOpen: false, answerPrompt: "" }`. 미설정 세션은 기본값 폴백.

스토어 액션:
- `setToppingGate(sessionId, partial: Partial<ToppingGate>)` — 부분 업데이트
- `getToppingGate(sessionId): ToppingGate` — 셀렉터 헬퍼

`addTopping`에서 가드: 닫힌 종류면 no-op + 콘솔 경고(데모 신뢰성).

## 발표자 UI (`src/routes/presenter.tsx`)

"토핑 키워드" 패널 헤더 아래에 컨트롤 카드를 새로 추가:

- 두 개의 Switch 행
  - "질문 받기" — questionsOpen 토글
  - "키워드 응답 받기" — answersOpen 토글
- answersOpen이 true일 때만 펼쳐지는 입력
  - 텍스트 인풋: "발문을 입력하세요 (예: 가장 인상 깊은 단어 한 개)"
  - 최대 60자, 실시간 저장
- 상태 요약 칩(질문 N / 응답 M 도착) — 기존 토핑 카운트 재활용

발표자가 세션을 바꾸면 해당 세션의 게이트로 표시.

## 청중 UI (`src/components/confesta/ToppingInput.tsx`)

- 탭(질문하기 / 키워드 응답)은 항상 표시
- 각 탭이 닫혀있으면 해당 탭 버튼에 잠금 아이콘 + 클릭 시 토스트("발표자가 아직 받지 않아요")
- 입력창
  - 현재 선택된 모드가 닫혀있으면 input disabled + placeholder를 "발표자가 곧 열어드려요"로 교체, 전송 버튼 비활성
  - 응답 모드가 열렸고 발문이 있으면 입력창 위에 발문 카드 표시 ("발표자의 질문: …")
- 두 모드 다 닫혀있어도 탭 자체는 표시(맥락 유지)

## 작업 항목

1. `src/lib/confesta/types.ts` — `ToppingGate` 타입 추가
2. `src/lib/confesta/store.ts` — `toppingGates` state + `setToppingGate` 액션 + `addTopping` 가드, persist 키 v5로 bump
3. `src/components/confesta/ToppingGateControl.tsx` (신규) — 발표자용 컨트롤 카드 (Switch 2개 + 발문 입력)
4. `src/routes/presenter.tsx` — 토핑 키워드 패널 상단에 `ToppingGateControl` 삽입
5. `src/components/confesta/ToppingInput.tsx` — 게이트 상태 구독, 탭/입력 비활성, 발문 카드 노출
6. (선택) `src/routes/audience.tsx`의 "토핑 보내기" 카드 설명문을 게이트 상태에 맞게 동적 변경

## 변경하지 않는 것

- 영수증/스쿱/QR 로직
- 기존 토핑 데이터 구조 (kind 필드 유지)
- 발표자의 질문 목록(QuestionStream) — 표시만 하므로 그대로
