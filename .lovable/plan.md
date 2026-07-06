# A안 — `list_toppings_with_my_like_v2` RPC 최적화 (리스크 재검토 반영)

## 변경 요약
`CREATE OR REPLACE FUNCTION`로 본문만 재작성. 시그니처·반환 shape·필터·정렬 완전 동일, per-row `EXISTS`만 `LEFT JOIN`으로 치환. 인덱스 추가/삭제 없음, 코드 변경 없음.

## 새 함수 본문
```sql
CREATE OR REPLACE FUNCTION public.list_toppings_with_my_like_v2(
  _session_id text,
  _device_id  uuid DEFAULT NULL::uuid,
  _limit      integer DEFAULT 100
) RETURNS TABLE (
  id uuid, session_id text, text text, kind text, prompt_id uuid,
  prompt_text text, pinned boolean, addressed boolean, likes integer,
  created_at timestamp with time zone, device_id uuid, role audience_role,
  op_id uuid, liked_by_me boolean
)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  WITH ranked AS (
    SELECT t.*, row_number() OVER (ORDER BY t.created_at DESC) AS rn
    FROM public.toppings t
    WHERE t.session_id = _session_id
  )
  SELECT
    r.id, r.session_id, r.text, r.kind, r.prompt_id,
    p.text AS prompt_text,
    r.pinned, r.addressed, r.likes, r.created_at,
    r.device_id, r.role, r.op_id,
    (_device_id IS NOT NULL AND l.topping_id IS NOT NULL) AS liked_by_me
  FROM ranked r
  LEFT JOIN public.answer_prompts p ON p.id = r.prompt_id
  LEFT JOIN public.topping_likes  l
    ON _device_id IS NOT NULL
   AND l.topping_id = r.id
   AND l.device_id  = _device_id
  WHERE r.kind = 'answer' OR r.pinned OR r.addressed OR r.rn <= _limit
  ORDER BY r.created_at DESC;
$function$;
```

## 리스크 재검토 결과 — 이상 없음

### 1. 기능 오작동 가능성: 없음
| 항목 | 판정 | 근거 |
|---|---|---|
| 반환 컬럼/타입/순서 | 동일 | `RETURNS TABLE` 정의 그대로 |
| `liked_by_me` 값 | 동치 | `topping_likes` PK가 `(topping_id, device_id)` UNIQUE → LEFT JOIN 매칭이 0 또는 1건. `EXISTS`와 완전 동치 |
| `_device_id = NULL` 케이스 | 동일 (false) | JOIN 조건에 `_device_id IS NOT NULL AND ...` 포함 → 매칭 없음 → `liked_by_me=false` |
| Row 개수 (중복 위험) | 안전 | `answer_prompts.id` PK, `topping_likes(topping_id,device_id)` UNIQUE — 양쪽 모두 최대 1건 매칭. row multiplication 불가 |
| 필터/정렬 | 동일 | `WHERE`·`ORDER BY` 절 그대로 |
| RLS/권한 | 동일 | `SECURITY DEFINER` 아님, `STABLE` + `SET search_path` 그대로. 호출자 권한으로 실행되는 점 동일 |

### 2. 서버비 과다 부과 가능성: 없음
- **DB CPU**: 감소 (per-row 서브쿼리 → 단일 JOIN)
- **Realtime**: 무관 (함수는 read-only, 이벤트 발생 없음)
- **Egress/Storage**: 무변화 (반환 payload 동일)
- **Edge Function 호출 수**: 무변화 (클라이언트가 호출 빈도를 늘리지 않음)
- **Connection**: 오히려 응답 시간 단축으로 pool 점유 감소

### 3. 다른 기능에의 악영향: 없음
- **호출부**: `src/lib/toppings.functions.ts`의 `.rpc("list_toppings_with_my_like_v2", ...)` 단 한 곳. 함수 시그니처·반환 shape 무변경으로 파싱 로직 무영향.
- **다른 RPC**: `list_all_toppings_admin`(관리자 통계), `list_toppings_with_my_like`(구 v1), `toggle_topping_like`(좋아요 쓰기), `topping_*_fill_session_id`(트리거) 전부 손대지 않음.
- **좋아요 카운트**: `toppings.likes` 컬럼은 `toggle_topping_like` RPC가 계속 정확히 갱신하고, 이 함수는 그 값을 그대로 SELECT할 뿐. 이전 팬아웃 차단 마이그레이션과 독립적으로 동작.
- **실시간 재조회**: 재조회 트리거·디바운스 로직 무변경.
- **관리자 화면**: `SlotToppingsModal` 등은 `list_all_toppings_admin` 사용 → 무영향.

### 4. 배포 리스크: 극소
- `CREATE OR REPLACE FUNCTION`은 짧은 ACCESS EXCLUSIVE 락(밀리초). 동시 호출은 잠깐 대기 후 진행. 무중단.
- **롤백**: 현재 본문(EXISTS 버전)을 다시 `CREATE OR REPLACE`로 재적용하면 즉시 원복. 데이터 손실 불가능(순수 함수 재정의).

### 5. 최악의 시나리오 시뮬레이션
- **Planner가 hash join 선택** → `topping_likes`에서 `device_id = _device_id` 필터가 매우 선택적(사용자 1인의 해당 세션 좋아요 수 ≤ 세션 토핑 수, 보통 <200행). `topping_likes_device_topping_idx (device_id, topping_id)` 인덱스로 커버. 여전히 EXISTS 반복보다 빠름.
- **세션 토핑 수가 매우 큰 경우(수천 개)** → `WITH ranked` 자체 비용은 이 계획으로 줄이지 않음(다음 단계 후보). 다만 EXISTS 반복이 사라져 현재 계획만으로도 개선.

## 결론
계획대로 진행해도 **기능 회귀, 비용 증가, 타 기능 간섭** 모두 발견되지 않음. 승인해주시면 마이그레이션 툴로 올리겠습니다.
