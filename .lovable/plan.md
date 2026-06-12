# 통계 그래프 위쪽 정렬

## 변경
`src/components/confesta/AnswerPie.tsx`에서 차트가 부모 영역 전체 높이를 채우며 세로 중앙에 배치되던 것을 위쪽 정렬로 변경.

- 최상위 wrapper를 `w-full h-full` → `w-full h-full flex flex-col items-stretch`로 변경.
- 차트 영역에 고정된 비율/최대 높이 부여: `h-[min(420px,60vh)]` 정도로 위쪽에 고정해 아래쪽 공간은 비움.
- `PieChart`의 `cy`를 `45%` → `42%`로 살짝 위로 보정 (Legend가 아래 붙으므로 균형 유지).

비어있는/안내 메시지(`promptId==null`, `total===0`) 상태도 동일하게 위쪽 정렬로 통일 (`items-center justify-center` → `items-center pt-10`).

## 영향 범위
- 프론트엔드 레이아웃만 수정. 데이터·서버 로직 변경 없음.
- 사용처는 발표자 뷰의 통계 탭 하나뿐이라 다른 화면에 영향 없음.
