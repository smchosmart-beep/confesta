## 문제 진단

발표자 화면에서 **질문 탭**과 **워드 탭**이 비어 보이는 원인은 두 가지가 겹쳐 있습니다.

1. **샘플 데이터 부족**: `src/lib/confesta/mockData.ts`의 `SAMPLE_TOPPINGS`에는 총 3개(`s1`×2, `s2`×1)만 있고, 나머지 세션(`s3`~`s8`)은 **0개**입니다. 발표자 화면에서 다른 세션을 선택하면 "토핑이 도착하면…" 빈 상태만 보입니다.
2. **persist 캐시 잔존**: zustand `persist({ name: "confesta-state-v1" })`가 로컬에 저장되어 있어, 시드를 늘려도 기존 사용자에게는 옛 `toppings: []`가 그대로 복원되어 반영되지 않습니다.

## 변경 계획

### 1. `src/lib/confesta/mockData.ts` — 샘플 토핑 대폭 확충
- 모든 세션(`s1`~`s8`)에 각각 6~10개의 한국어 질문을 추가 (총 60개 내외).
- 키워드가 자연스럽게 반복되도록 작성해 **워드클라우드**가 의미 있게 보이도록 함 (예: "배수", "프롬프트", "초3", "평가", "수업", "AI", "데이터", "협력학습" 등 세션 주제별 키워드 군집).
- 일부 항목은 `pinned: true`, `addressed: true` 플래그로 표시해 질문 탭 필터(핀/미답변/답변완료)가 동작하는 모습이 보이도록 함.
- 타입을 확장: `SAMPLE_TOPPINGS` 항목에 선택적 `pinned`, `addressed`, `ageMin`(몇 분 전) 필드 허용.

### 2. `src/lib/confesta/store.ts` — 시드 매핑 + persist 버전 갱신
- `initialToppings` 매핑이 새 필드(`pinned`, `addressed`)와 `createdAt = Date.now() - ageMin*60_000`을 반영하도록 수정.
- `persist` 설정에 **`version: 2`** 와 **`migrate`** 함수를 추가:
  - 옛 v1 상태를 받아도 `toppings` 배열이 비어 있거나 `seed-`로 시작하는 항목만 있다면 새 시드로 교체.
  - 사용자 입력으로 추가된 항목(id가 `seed-`가 아닌 것)은 보존하고 시드와 병합.
- 또는 더 안전하게 `name: "confesta-state-v2"`로 바꿔 강제 재시드 (사용자 추가 항목은 데모이므로 손실 영향 없음). **이 방식을 채택**.

### 3. 검증 포인트
- 발표자 화면 → 핸드헬드 모드 → **질문 탭**: 세션 전환 시 각 세션마다 카드가 6~10장 보이고, 핀/미답변/답변완료/정렬 필터가 동작.
- **워드 탭**: 키워드가 그라데이션 텍스트로 다양하게 표시되고 빈도에 따라 크기 차이가 보임.
- **무대 모드 하단 마퀴**와 청중 화면 토핑 입력도 동일한 풍부한 시드를 공유.

## 변경 파일

- `src/lib/confesta/mockData.ts` — `SAMPLE_TOPPINGS` 대폭 확장 + 타입 확장
- `src/lib/confesta/store.ts` — `initialToppings` 매핑 보강, persist 키 `confesta-state-v2`로 변경

UI/레이아웃 코드 변경 없음. 순수 데이터/시드 보강입니다.
