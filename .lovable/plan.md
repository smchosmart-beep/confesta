## 문제

`ToppingInput.tsx`의 입력 폼이 가로 한 줄(`input` + 우측 둥근 전송 버튼)로 구성되어, 질문이 길어지면 텍스트가 가로로 잘리고 전송 버튼이 좁아 보이는 모바일 UX 문제.

## 수정 (`src/components/confesta/ToppingInput.tsx`만 변경)

1. **`<input>` → 자동 높이 `<textarea>`**
   - `rows={1}`, `resize-none`, `overflow-hidden`로 시작
   - `onChange`에서 `e.target.style.height = "auto"; e.target.style.height = scrollHeight + "px"` 로 내용에 따라 세로 확장 (max-height ~ `12rem` 후 내부 스크롤)
   - 텍스트 초기화 시(`setText("")`) ref로 높이 리셋
   - `Enter` = 전송, `Shift+Enter` = 줄바꿈 (`onKeyDown` 처리). 키워드 응답(`kind === "answer"`)은 한 줄 유지를 위해 textarea 대신 기존 input 유지하거나 동일하게 처리 — 동일 textarea로 통일하되 응답 모드는 `maxLength=24`로 자연 제한.

2. **레이아웃: 둥근 알약 → 둥근 카드 + 하단 전송 버튼**
   - 컨테이너를 `rounded-2xl`로 바꾸고 `flex-col`:
     - 상단: ✨ 아이콘 + textarea (`flex items-start gap-2`)
     - 하단: 우측 정렬된 전송 버튼 (`자신있게 보내기` 라벨 + Send 아이콘, `bounce-press bg-grad-strawberry`, 풀폭 또는 우측 정렬)
   - 글자수 카운터(`{text.length}/{max}`)를 버튼 좌측에 작게 표시 (선택)

3. **sprinkles 위치**는 컨테이너 상단(-top-2)으로 그대로 유지 (form 절대 위치 기준).

다른 기능/스타일은 건드리지 않음. 발표자/관리자 화면 영향 없음.

## 검증

- 짧은 질문: 카드 높이 1줄 분량.
- 긴 질문 입력 시 textarea가 세로로 늘어나고, 약 6줄 이상이면 내부 스크롤로 처리되며 가로 오버플로우 없음.
- 모바일에서 전송 버튼이 입력창 하단에 명확하게 표시되어 탭하기 쉬움.
- Enter 전송 / Shift+Enter 줄바꿈 동작.
