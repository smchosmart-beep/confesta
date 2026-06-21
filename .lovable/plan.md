## 변경 내용

답변(answer) 토핑을 **공백 단위 단어**로 잘라 빈도 집계합니다. 워드클라우드와 응답 파이차트 모두에 적용합니다.

예: 응답 `"다했는데 뭐해요?"` → `다했는데(1)`, `뭐해요(1)`
응답 `"사과가 좋아요"` + `"사과"` → `사과(2)`, `좋아요(1)`

## 적용 파일

1. `src/components/confesta/ToppingTubScene.tsx` (워드클라우드)
   - `extractAnswerKeywords(...)` → `extractKeywords(...)` 로 교체.

2. `src/components/confesta/AnswerPie.tsx` (응답 파이차트)
   - 현재: 응답 텍스트를 `trim().toLowerCase()` 한 키로 묶어 집계.
   - 변경: `extractKeywords([응답텍스트들])` 결과를 `{ name: word, value: count }` 로 매핑.
   - 상위 6개 + "기타" 합산 로직 유지, 총합(`total`)은 단어 등장 합계로 계산 (퍼센티지 표시 일관).

3. `src/lib/confesta/keywords.ts`
   - 더 이상 사용되지 않는 `extractAnswerKeywords` 제거.

## 단어 파싱 규칙 (기존 `extractKeywords` 그대로 사용)

- 한국어 조사/어미 자동 제거 (`사과가` → `사과`).
- 서술형 어미(`합니다`, `예요` 등)는 제외하지만 `해요`/`는데` 등은 살아남아 예시(`뭐해요`, `다했는데`)는 그대로 집계됩니다.
- 길이 필터: 한글 2자 이상, 영문/숫자 3자 이상.
- 불용어(`은/는/이/가`, `그리고`, `the/and` 등) 제외.

## 영향 없음

- 토핑 저장/서버 로직, 질문(question) 토핑 처리 로직은 변경 없음.