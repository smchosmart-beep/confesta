## 검토 결론
- **기능 오작동**: 없습니다. CSS만 수정하며 스포트라이트 모달의 데이터 흐름/상태는 그대로입니다.
- **서버비 과다 부과**: 없습니다. 서버 함수 호출이나 DB 쿼리가 늘어나지 않습니다.
- **타 기능 악영향**: 없습니다. 수정 영역은 `QuestionSpotlightModal.tsx` 단일 컴포넌트이며 다른 페이지나 컴포넌트를 참조하지 않습니다.

## 기존 계획에서 보완할 점
`bg-grad-sunset-soft`는 `@utility` 클래스이지 CSS 변수(`var(--gradient-sunset-soft)`)가 아닙니다. `style`에 `var(--gradient-sunset-soft)`를 사용하면 값이 없어 배경이 사라질 수 있습니다. 두 그라디언트를 동시에 적용하려면 인라인 스타일로 직접 쓰거나, 구조를 바꿔야 합니다.

더 안전한 방법은 **스크롤 컨테이너 안에 `min-h-full` wrapper를 두고, 그 wrapper 안에 기존 absolute 그라디언트 레이어를 그대로 유지**하는 것입니다. 이렇게 하면 wrapper가 실제 콘텐츠 높이만큼 늘어나므로 absolute 배경도 댓글이 길어진 전체 영역을 덮습니다. 기존 색상/투명도(60%)를 변경하지 않아 시각적 차이가 없습니다.

## 수정 방안
- 파일: `src/components/confesta/QuestionSpotlightModal.tsx`
- 안쪽 스크롤 카드 div를 다음과 같이 변경:
  - `p-8 sm:p-12` padding을 내부 wrapper로 이동
  - 내부 wrapper에 `relative min-h-full` 추가
  - 기존 `bg-grad-cream` / `bg-grad-sunset-soft opacity-60` absolute div를 그대로 wrapper 내부에 유지
  - 콘텐츠(`p` 태그, `PresenterCommentBlock` 등)는 wrapper 내부에 배치, `relative`는 그대로 유지해도 무방

  예상 구조:
  ```tsx
  <div className="relative overflow-hidden max-w-4xl w-full max-h-[85vh] overflow-y-auto rounded-[2rem] shadow-pink animate-scale-in border border-white/60">
    <div className="relative min-h-full p-8 sm:p-12">
      <div className="absolute inset-0 bg-grad-cream pointer-events-none" />
      <div className="absolute inset-0 bg-grad-sunset-soft opacity-60 pointer-events-none" />
      <p className="relative ...">청중 질문 스포트라이트</p>
      ...
    </div>
  </div>
  ```

## 검증
- `bun run tsgo` 또는 `bunx tsc --noEmit` 타입 체크
- `/presenter` 접속 후 스포트라이트 모달 열어 댓글이 많은 질문에서 스크롤 상/하단 모두 분홍 배경이 연결되어 보이는지 확인