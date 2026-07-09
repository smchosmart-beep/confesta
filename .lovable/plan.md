## 목표
AlertDialog 모달(질문 삭제, 댓글 삭제 등)이 흰 배경 + 붉은 버튼의 기본 shadcn 톤이라 앱의 크림/핑크·둥근·부드러운 톤과 이질감이 큼. 앱 톤(크림 배경, 라운드-3xl, 핑크 그라디언트, `shadow-pink/cream`)에 맞춰 통일.

## 변경 파일
1. `src/components/ui/alert-dialog.tsx` — 공통 스타일 앱 톤으로 교체
   - `AlertDialogOverlay`: `bg-black/80` → `bg-foreground/70 backdrop-blur-sm`
   - `AlertDialogContent`: `bg-background sm:rounded-lg border p-6 shadow-lg` → `bg-grad-cream border border-white/70 rounded-3xl p-6 sm:p-7 shadow-pink max-w-sm` (스케일 인 애니메이션 유지)
   - `AlertDialogTitle`: `text-lg font-semibold` → `text-xl font-extrabold text-foreground text-center`
   - `AlertDialogDescription`: 중앙 정렬 + `text-[13px]` 미세 조정
   - `AlertDialogFooter`: 모바일 우선 세로 스택, `gap-2`, 우측 정렬 대신 풀폭
   - `AlertDialogAction`: 기본 버튼 대신 `rounded-full px-4 py-2.5 font-bold text-white bg-grad-strawberry shadow-pink bounce-press w-full` — 소비자가 `className`로 색 오버라이드 가능(예: 파괴적 액션은 `bg-red-500` 계열 유지 옵션)
   - `AlertDialogCancel`: `rounded-full bg-white/85 border border-white text-foreground font-bold w-full bounce-press`

2. 사용처에서 붉은 오버라이드 톤 조정(선택)
   - `PresenterCommentBlock.tsx`, `QuestionCommentBlock.tsx`, `audience.tsx`, `BookmarkBar.tsx`에서 삭제 액션에 붙어 있는 `bg-red-600 hover:bg-red-700`을 앱 파괴적 톤으로 통일: `bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-90`. 새 기본 스타일과 자연스럽게 어우러지고 삭제라는 시맨틱은 유지.

## 비변경
- 로직/기능 없음. 순수 프레젠테이션만.
- 다른 Dialog(예: `SlotQRModal`, `QuestionSpotlightModal`)는 이미 앱 톤 커스텀 모달이라 손대지 않음.

## 검증
- `/audience`에서 내 질문 삭제 다이얼로그, 내 댓글 삭제 다이얼로그, 발표자 댓글 삭제 다이얼로그가 크림 배경 + 둥근 카드 + 핑크 CTA로 보이는지 스크린샷 확인.
