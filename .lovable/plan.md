## 목표

청중이 `/audience` 첫 진입 시(직접 URL / `?qr=…` 자동 스캔 / 메인에서 청중 카드 클릭) **교사 · 전문직 · 학부모 · 기타** 중 하나를 먼저 선택해야 청중 메뉴로 들어간다. 선택한 역할은 토핑(질문/응답)에 함께 저장되어 발표자/운영자 화면에서 역할별 색상 배지·필터로 구분된다.

## 사용자 흐름

1. `/audience` 접근 → localStorage에 역할이 있으면 그대로 본문 진입. 없으면 **역할 선택 게이트**가 전면 표시.
2. 4개 큰 버튼 중 하나 탭 → localStorage 저장 + 백그라운드로 서버 upsert → 게이트 해제 → 기존 청중 화면 진입(`?qr=…` 가 있으면 그때 자동 주문/수령 처리).
3. 헤더에 현재 역할 배지 + "변경" 버튼.
4. 이후 토핑 추가 시 현재 역할이 자동으로 함께 저장.

## 화면별 역할 표시

- 청중 본인의 토핑 카드, 발표자 Live 피드, AnswerPromptCard, QuestionStream, QuestionSpotlightModal에 **역할 색상 배지**(교사=mint, 전문직=blueberry, 학부모=strawberry, 기타=회색).
- QuestionStream/Answer 화면 상단에 **역할 필터 칩**(전체/교사/전문직/학부모/기타) — 클라이언트 사이드 필터.
- WordCloud는 색 입히지 않음(텍스트 집계라 역할 매핑 불명확).
- 역할이 NULL인 기존(legacy) 토핑은 "기타"로 표기·필터링.

## 데이터 모델

마이그레이션 1회. NULL 허용 컬럼 추가만 → 테이블 재기록 없음.

```sql
CREATE TYPE public.audience_role AS ENUM ('teacher','specialist','parent','other');

ALTER TABLE public.audience_devices ADD COLUMN role public.audience_role;
ALTER TABLE public.toppings         ADD COLUMN role public.audience_role;

-- RPC 반환 컬럼이 늘기 때문에 CREATE OR REPLACE 불가 → DROP 후 재생성
DROP FUNCTION public.list_toppings_with_my_like(text, uuid);
CREATE FUNCTION public.list_toppings_with_my_like(_session_id text, _device_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, session_id text, text text, kind text, prompt_id uuid,
              pinned boolean, addressed boolean, likes integer, created_at timestamptz,
              device_id uuid, role public.audience_role, liked_by_me boolean)
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT t.id, t.session_id, t.text, t.kind, t.prompt_id, t.pinned, t.addressed,
         t.likes, t.created_at, t.device_id, t.role,
         CASE WHEN _device_id IS NULL THEN false
              ELSE EXISTS(SELECT 1 FROM public.topping_likes l
                          WHERE l.topping_id = t.id AND l.device_id = _device_id) END
  FROM public.toppings t WHERE t.session_id = _session_id
  ORDER BY t.created_at DESC;
$$;
```

GRANT/RLS 변경 없음(기존 테이블에 컬럼 추가만).

## 코드 변경

### 신규
- `src/lib/confesta/audienceRole.ts` — `AUDIENCE_ROLES` 배열, `roleLabel(key)`, `roleAccentClass(key)`. role NULL → "기타" fallback 헬퍼.
- `src/hooks/use-audience-role.ts` — 3-상태 `"loading" | "none" | AudienceRole` 반환. localStorage(`confesta:audience-role`) 동기 읽기 + `setRole()` 호출 시 localStorage 기록 후 백그라운드 `setAudienceRole` 서버 fn. 같은 값 재선택 시 서버 호출 생략.
- `src/components/confesta/AudienceRoleGate.tsx` — 4개 큰 선택 카드. role==="loading" 일 땐 렌더하지 않음(깜빡임 방지).
- `src/lib/confesta/audienceRole.functions.ts` — `setAudienceRole({ deviceId, role })` serverFn: `audience_devices` upsert with role 컬럼.

### 수정
- `src/routes/audience.tsx`
  - `AudienceView` 최상단에서 `useAudienceRole()` 결과를 사용. `"loading"` → 본문/게이트 둘 다 숨김. `"none"` → `<AudienceRoleGate/>` 만 렌더(헤더 포함 본문 hidden). **Hook 순서 유지를 위해 early-return 대신 조건부 렌더링.**
  - `?qr=…` 처리 `useEffect` 가드에 `if (role === "loading" || role === "none") return;` 추가 → 게이트 통과 전 자동 주문/수령 트리거 방지.
  - 헤더에 역할 배지 + "변경" 클릭 시 게이트 재오픈.
- `src/lib/confesta/toppings.functions.ts`
  - `ToppingDTO`에 `role: AudienceRole` 추가(NULL → `"other"` 매핑).
  - `addTopping` inputValidator에 `role` 추가, insert 시 함께 저장.
  - `listToppings` RPC 응답 매핑에 role 포함.
  - `listMyToppingsForReceipt` 등 다른 select에도 `role` 컬럼 포함(타입 재생성 후 누락 시 컴파일 에러 방지).
- `src/hooks/use-toppings.ts` — `addTopping` mutate에 현재 role 전달.
- `src/components/confesta/ToppingInput.tsx` — `useAudienceRole()` 결과를 mutate 호출에 포함.
- `src/components/confesta/QuestionStream.tsx`, `AnswerPromptCard.tsx`, `SampleAnswerPromptCard.tsx`, `QuestionSpotlightModal.tsx` — 역할 배지 추가. QuestionStream/Answer 컨테이너에 역할 필터 칩.
- `src/lib/confesta/audience.functions.ts` — `touchDevice` upsert는 `role`을 페이로드에 포함하지 않으므로 그대로 두면 안전(주석으로 명시).

## 부작용 가드 요약

| 위험 | 대응 |
|---|---|
| RPC 반환 시그니처 변경 | `DROP FUNCTION` 후 `CREATE FUNCTION` (한 마이그레이션) |
| 게이트 중 `?qr` 자동 처리 폭주 | role gating 이전엔 effect 가드로 무동작 |
| 첫 렌더 게이트 깜빡임 | `useAudienceRole`의 `"loading"` 상태로 렌더 보류 |
| `touchDevice` upsert가 role 덮어쓰기 | 페이로드에 role 미포함 → 영향 없음(주석 명시) |
| legacy 토핑 표시 | NULL → "기타"로 표시·필터(분리 표기 안 함) |
| 서버 부하 | role 변경 1회 upsert만 추가, 폴링/realtime 신규 없음 |
| 다른 화면(발표자/Admin/Staff/북마크/영수증) | 토핑 외 흐름은 무관 — 영향 없음 |
| TypeScript 타입 | 마이그레이션 승인 후 `types.ts` 자동 재생성 → DTO 매핑 동시 갱신 |
