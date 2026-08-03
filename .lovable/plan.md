## 목표
관리자 화면에서 (1) 세션별, (2) 전체 데이터를 엑셀(.xlsx)로 내려받는 버튼 추가. 라이브러리는 `xlsx`(SheetJS) 대신 유지보수되는 **`write-excel-file`** 사용.

## 라이브러리
- `bun add write-excel-file`
- 브라우저 전용, 경량, 알려진 고위험 CVE 없음. `xlsx`(0.18.5, CVE-2023-30533 npm 미배포)는 사용하지 않음.
- 클릭 시점에 `await import("write-excel-file")`로 동적 로드 → 초기 번들·SSR 영향 없음.

## 파일 변경

### 1. 신규 `src/lib/confesta/excel.ts` (클라이언트 유틸)
- `buildToppingRows(toppings, promptTextById)` → 시트용 행 배열 생성.
- `downloadToppingsWorkbook({ fileName, sheets })`:
  - 시트 1 **질문**: 세션명 / 작성일시 / 역할 / 질문내용 / 좋아요 / 고정 / 답변완료
  - 시트 2 **키워드응답**: 세션명 / 작성일시 / 역할 / 발문(promptText) / 응답내용
  - 시트 3 **발문목록**: 세션명 / 발문 / 생성일시 / 응답수
- 헤더 행은 bold + 열 너비 지정, 날짜는 `YYYY-MM-DD HH:mm` 문자열로 고정(타임존 혼선 방지).

### 2. 신규 `src/lib/confesta/export.functions.ts` (관리자 전용 서버 함수)
- `exportAllToppings`: `assertRole("admin")` 후 `supabaseAdmin`으로
  - `toppings` 전량(1000건 단위 range 페이지네이션)
  - `answer_prompts` 전량
  - `session_slots`(id, title, category) → 세션명 매핑
  반환: `{ toppings, prompts, slots }` (필요 컬럼만 투영).
- 기존 `listAllToppingsAdmin`은 그대로 두고 건드리지 않음.

### 3. `src/components/confesta/SlotToppingsModal.tsx`
- 헤더에 "엑셀 다운로드" 버튼 추가.
- 이미 모달이 받아둔 `listAllToppingsAdmin` 결과를 재사용 → **추가 쿼리 0건**.
- 파일명: `confesta_{세션명}_{YYYYMMDD}.xlsx`.

### 4. `src/routes/admin.tsx`
- 대시보드 상단 액션 영역에 "전체 엑셀 다운로드" 버튼 추가.
- 클릭 시 `exportAllToppings` 호출 → `downloadToppingsWorkbook` 실행, 진행 중 스피너/비활성화, 실패 시 sonner 토스트.
- 파일명: `confesta_전체_{YYYYMMDD}.xlsx`.

## 안전성 검토 (기확인)
- 데이터 규모: `toppings` 1,529행 / `answer_prompts` 80 / `session_slots` 79 → 전체 페이로드 수백 KB. 타임아웃·비용 위험 없음.
- 권한: 기존 `assertRole("admin")` 쿠키 PIN 검증과 동일 패턴.
- 기존 기능: 신규 파일 + 버튼 추가만. Realtime·삭제·집계 로직 무변경 → 회귀 없음.

## 확인 필요
- `session_slots.category` 컬럼을 엑셀에 포함할지 (기본값: 포함).
