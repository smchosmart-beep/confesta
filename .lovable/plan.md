# 통계 원그래프 ~3배 확대

## 현황
`src/components/confesta/AnswerPie.tsx`:
- 차트 컨테이너: `h-[min(420px,60vh)]` (최대 420px로 캡)
- Pie: `outerRadius="62%" innerRadius="34%"`, margin `top:24 right:24 bottom:32 left:24`
- 발표자 `/presenter` 통계 탭 부모는 `flex-1 min-h-0`로 가용 공간이 ~600–700px 있는데도 420px에 묶임
- 청중용 `AnswerPromptCard`는 `<div className="w-full h-80">` 320px 박스로 감싸 사용 → 변경에 영향 없음(부모가 더 작게 잡으므로 그쪽이 우선)

## 변경
오직 `src/components/confesta/AnswerPie.tsx` 1파일.

1. 차트 컨테이너 클래스 변경
   - 기존: `w-full h-[min(420px,60vh)]`
   - 변경: `w-full flex-1 min-h-[320px]`
   - 효과: 발표자 통계 탭에서 `flex-1` 부모를 가득 채워 ~3배 가까이 커짐. AnswerPromptCard의 고정 `h-80` 래퍼 안에서는 그대로 320px 유지(부모가 작아 시각적 변화 없음).

2. 외부 래퍼도 컬럼을 다 쓸 수 있게
   - 기존: `<div className="w-full h-full flex flex-col items-stretch">`
   - 그대로 유지(이미 `h-full`).

3. 파이 비율 조금 키워 시각적 임팩트 강화
   - `outerRadius="62%"` → `"82%"`
   - `innerRadius="34%"` → `"44%"`
   - `cy="42%"` → `"45%"` (Legend 공간 확보 유지)
   - margin `top:24 right:24 bottom:32 left:24` → `top:16 right:16 bottom:24 left:16`

4. 라벨/레전드는 그대로 두되 레전드 폰트 살짝 키움
   - `wrapperStyle={{ fontSize: 11, paddingTop: 16 }}` → `{{ fontSize: 13, paddingTop: 12 }}`

## 검증
- `/presenter` 통계 탭 진입 → 차트가 좌측 컬럼 가용 높이를 채우며 약 2.5–3배 확대되는지 확인
- 청중 화면 `AnswerPromptCard` 내부 통계 미니 차트가 깨지지 않는지 확인 (h-80 박스 안 유지)
- 응답이 0개일 때 placeholder 위치가 어색하지 않은지 확인

## 영향 범위
- 변경 파일: `src/components/confesta/AnswerPie.tsx`
- 데이터/로직 변경 없음, 순수 시각 사이즈 조정
