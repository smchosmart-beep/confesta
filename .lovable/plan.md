## 문제
발표자 화면 모바일에서 `RoleHeader` 우측(`right`)의 `SlotPickerBar`(4개 Select)가 아이콘+제목과 나란히 배치되어 폭 부족으로 잘림. 스크린샷: "LEWEST H…", "10:00~11:5…", 세션 "개막…" 등이 잘려 확인 불가.

원인: `RoleHeader`의 메인 행이 `flex items-center gap-9`로 좌(icon+title, flex-1) / 우(right, flex-1) 5:5 분할 → 좁은 뷰포트에서 각 Select가 wrap해도 오른쪽 절반 안에 갇힘.

## 목표
- 모바일(< md)에서만 헤더 아래로 `right` 콘텐츠를 풀 폭으로 스택.
- md 이상 PC/태블릿 레이아웃은 **완전 무변경**.

## 변경 (단일 파일)
`src/components/confesta/RoleHeader.tsx` 메인 행만 반응형 처리:

- 컨테이너: `flex items-center gap-9` → `flex flex-col md:flex-row md:items-center gap-4 md:gap-9`
- 좌측(icon+title) 래퍼: 모바일에선 icon과 title이 가로로 나란히 되도록 `flex items-center gap-4` 소블록으로 감싸기 (기존 md+ 동작 유지 위해 md에서는 기존 스타일 그대로)
- 우측 `right` 블록: 모바일에서 `w-full`, md+에서 기존 `flex-1 min-w-0` 유지
  - 예: `className={"relative w-full md:flex-1 md:min-w-0"}`

## 부작용/영향
- **PC(md≥) 무변경**: `md:flex-row` + `md:flex-1` + `md:gap-9`로 기존 클래스 전부 유지 → admin/staff/audience의 데스크톱 헤더 픽셀 동일.
- 모바일: `right`를 사용하는 화면(발표자만 실질 사용, admin/staff/audience는 대부분 `right` 없음)에서 헤더 하단에 자연스럽게 스택.
- 서버/DB/과금/서버함수 무영향.
- 기능 로직 변경 없음 — 순수 CSS 클래스만 조정.

## 검증
- 모바일 뷰포트(384px): 일자/시간대/장소/세션 Select 모두 잘리지 않고 접근 가능, `flex-wrap` 자연 배치.
- PC 뷰포트: 픽셀 diff 없음.
