## 목표
청중 헤더에서 설명 문구를 제거하고, 역할 배지를 "청중 (Audience)" 제목 오른쪽에 제목과 비슷한 크기로 인라인 배치한다.

## 변경 파일

### 1. `src/components/confesta/RoleHeader.tsx`
- 신규 prop `titleTrailing?: React.ReactNode` 추가.
- `<h1>`을 `<div className="flex items-center gap-2 min-w-0">`로 감싸 제목 옆에 `titleTrailing`을 인라인 렌더. 제목에는 `truncate` 유지, 트레일링에는 `shrink-0`.
- 기존 `right` prop과 `description`/`subtitle` 로직은 그대로 보존(다른 화면 영향 없음).

### 2. `src/routes/audience.tsx` (335~352행 부근)
- `RoleHeader` 호출에서 `description` prop 삭제.
- 기존 `right`에 있던 역할 변경 버튼(RoleBadge 포함)을 `titleTrailing`으로 이동.
- 배지 크기를 제목(text-2xl)과 조화시키기 위해 `RoleBadge`에 `size="sm"` + `className="text-sm px-2.5 py-1"` (Tailwind 뒤 클래스 우선)로 살짝 키움. 아이콘 크기는 기본 유지.
- `right` prop은 넘기지 않아 우측 빈 공간이 사라지고 헤더가 컴팩트해짐.

## 미변경
- 다른 화면(presenter, admin 등)의 `RoleHeader` 사용은 무변경.
- RoleBadge 컴포넌트 자체 로직 변경 없음(외부 className 오버라이드만 사용).

## 검증
- 모바일 프리뷰: 설명 문구 사라짐, 제목 오른쪽에 "교원" 배지 인라인 표시, 탭·아래 레이아웃 정상.
- Typecheck.
