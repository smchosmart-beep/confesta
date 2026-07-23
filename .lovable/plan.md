## 목표
모바일 청중화면 상단 탭(주문 / My 콘 / 토핑 추가 / 영수증)을 좌우로 꽉 채우고 폰트/터치 영역을 크게 키운다.

## 변경 파일
1. **`src/components/confesta/PillTabs.tsx`**
   - 컨테이너를 `inline-flex` → `flex w-full`로 변경, 각 버튼에 `flex-1`을 부여해 균등 분할.
   - 모바일 사이즈(`md` 기준) 패딩/폰트 상향:
     - `px-2.5 py-1.5 text-[11px]` → `px-3 py-2.5 text-sm`
     - `sm:` 브레이크포인트는 기존과 동일하게 `sm:px-5 sm:py-2 sm:text-sm` 유지(데스크톱 톤 보존).
   - 아이콘 크기 옵션은 그대로 두되, 좁은 화면에서 눌러 넣을 수 있도록 `gap-1.5`.

2. **`src/routes/audience.tsx` (357~369행)**
   - `overflow-x-auto` + `min-w-max` 스크롤 트릭 제거 후 `w-full`로 감싸 탭이 화면 폭을 꽉 채우게 함.

## 미변경
- 데스크톱 레이아웃, `PillTabs` 사용하는 다른 화면(있다면 `size="sm"` 경로) 톤은 유지.
- 색상·아이콘·상태 로직 무변경.

## 검증
- 모바일 프리뷰(384px)에서 4개 탭이 한 줄로 좌우 꽉 차고 폰트가 눈에 띄게 커진 것 확인.
- Typecheck.
