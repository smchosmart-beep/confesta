## 수정

### 1) `src/components/confesta/AnswerPromptCard.tsx` — 응답 입력 폼을 `ToppingInput`과 동일한 카드형으로 통일
- 컨테이너: `flex items-center ... rounded-full p-1.5` → `flex flex-col gap-2 bg-card border border-white/60 rounded-2xl p-3 shadow-pink`
- `<input>` → 자동 높이 `<textarea>` (`ref`, `rows={1}`, `resize-none overflow-y-auto`, `style={{ maxHeight: 192 }}`, `min-w-0`, `break-words`, `leading-relaxed`)
- 상단: 아이콘(Megaphone/Lock) + textarea (`flex items-start gap-2`, 아이콘 `mt-1.5`)
- 하단: 좌측 `{text.length}/24` 카운터, 우측 보내기 버튼 (`bounce-press bg-grad-strawberry rounded-full px-4 py-2 text-xs font-bold` + Send 아이콘 + "보내기" 라벨)
- `onKeyDown`: **추가하지 않음** (Enter = 줄바꿈 기본 동작)
- `useEffect`로 text 변화 시 textarea 자동 높이 조정, 전송 후 `setText("")`로 리셋 시에도 높이 복귀

### 2) `src/components/confesta/ToppingInput.tsx` — Enter 전송 동작 제거
- 현재 `onKeyDown`에서 `Enter && !shift` 시 전송하는 핸들러 제거
- Enter는 textarea 기본 줄바꿈으로 동작, 전송은 보내기 버튼 클릭으로만

## 검증

- 키워드 응답 카드: 짧은 응답은 한 줄 카드, 긴 응답이나 다국어 입력 시 가로 오버플로우 없이 세로 확장.
- 모바일 키보드에서 Enter 키 누르면 줄바꿈만 되고 전송되지 않음 (질문/응답 모두).
- 보내기 버튼만 전송 동작 수행.
