## 1. 바로가기 추가 — "확인" 버튼 무반응 수정

원인: `BookmarkBar.tsx`의 `AddBookmarkDialog`에서 `disabled={!canSubmit}`로 막혀 있어, 사용자가 제목만 입력하거나 링크/파일 둘 다 비웠을 때 클릭이 무시되고 피드백도 없음. 네트워크 요청 자체가 발생하지 않음.

수정 (`src/components/confesta/BookmarkBar.tsx`):

- 확인 버튼은 `disabled={submitting}`만 적용 (항상 클릭 가능, 업로드 중에만 잠금).
- `handleSubmit` 진입 시 검증을 명시적으로 수행하고 실패하면 `toast.error`로 안내:
  - 제목 미입력 → "버튼 제목을 입력하세요"
  - 링크/파일 둘 다 비어있음 → "링크 또는 파일 중 하나는 필요해요"
  - URL 형식 오류 메시지는 기존 그대로 유지
- (참고) 백엔드/검증 로직은 변경 없음.

## 2. 다이얼로그 라이트박스 위로 키워드가 비치는 문제 수정

원인: `ToppingTubScene.tsx`의 떨어지는 키워드 pill에 `style={{ zIndex: p.z }}`가 적용되는데 `p.z` 가 최대 100. 부모 컨테이너가 stacking context를 만들지 않아서, Radix Dialog의 오버레이(z-50)/콘텐츠(z-50)와 같은 root stacking context에서 경쟁 → 가장 큰(=z 가장 높은) 키워드만 오버레이 위로 솟아오름.

수정 (`src/components/confesta/ToppingTubScene.tsx`):

- 최상위 컨테이너에 `isolate` (CSS `isolation: isolate`) 추가하여 새 stacking context 생성. 이렇게 하면 내부 `z-index`가 외부 Dialog 오버레이를 넘어설 수 없음.
- 변경 라인은 컨테이너 `<div className="relative overflow-hidden rounded-3xl border ... isolate ...">` 한 곳.

다른 사이드 이펙트 없음: 내부 pill 간의 상대적 z-order는 그대로 유지됨(부모 stacking context 내부에서 계산).

## 검토 — 부작용 / 비용

- 백엔드 변경 없음, 서버 함수/RLS/스토리지 정책 영향 없음.
- 추가 네트워크 호출이나 리렌더 부담 없음.
- 다른 모달(QR 모달, 설정 모달 등) 동작에 영향 없음(키워드 z-index가 더 이상 오버레이를 침범하지 못하므로 오히려 일관됨).
