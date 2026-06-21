발표자 화면의 `BookmarkChip`이 클릭해도 반응이 없는 문제를 수정합니다.

- `src/components/confesta/BookmarkBar.tsx`의 `BookmarkChip`에 클릭 핸들러를 추가합니다.
- `item.url`이 있으면 해당 링크를 새 탭으로 엽니다.
- `item.fileUrl`(Storage 공개 URL)이 있으면 해당 파일을 새 탭으로 엽니다.
- 삭제 버튼은 `stopPropagation()`으로 분리하여 기존 동작을 유지합니다.
- 클릭 가능함을 나타내는 hover 스타일을 유지하거나 강조합니다.