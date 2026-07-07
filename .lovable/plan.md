# A안 + 중복 제출 대비책 — 재조회 디바운스 상향 + 3중 방어 (리스크 재검토 반영)

## 왜 대비책이 필요한가
디바운스 상향(600→2000ms)의 지연 자체는 **본인 화면에는 무관**합니다. `use-toppings.ts:120-123`의 `addTopping.onSuccess`가 mutation 성공 즉시 `["toppings", sessionId]`와 `["my-toppings", deviceId]`를 invalidate하므로 realtime을 기다리지 않고 로컬 재조회로 바로 표시됩니다.

그러나 네트워크 왕복 자체가 2000명 부하로 느려질 수 있고, 현재 UI(`ToppingInput.tsx:193-201`)는 제출 버튼에 pending 잠금이 없고, 서버측 중복 방지도 없어 재클릭 시 DB에 진짜 중복 row가 쌓입니다.

---

## 변경 사항

### 1. realtime 디바운스 상향 (핵심)
**파일**: `src/lib/confesta/realtime-channel.ts` (line 37-38)

```ts
const NOTIFY_DEBOUNCE_MS = 2000;         // was 600
const NOTIFY_DEBOUNCE_JITTER_MS = 1000;  // was 200
```
실효 1000~3000ms 균등 분포. 주석도 2000명 기준으로 갱신.

### 2. 제출 pending 잠금 + 시각 피드백
**A. `src/hooks/use-toppings.ts`**: 반환 객체에 `isSubmitting: addTopping.isPending` 추가, useMemo deps 갱신.

**B. `src/components/confesta/ToppingInput.tsx`**:
- `const { submit, isSubmitting } = useSessionToppings(sessionId);`
- textarea `disabled={!currentOpen || isSubmitting}`
- 버튼 `disabled={!text.trim() || !currentOpen || isSubmitting}`
- pending 시 라벨 `<Loader2 className="w-3.5 h-3.5 animate-spin" /> 보내는 중…` (lucide-react `Loader2` import 추가)

### 3. 서버측 소프트 dedup
**파일**: `src/lib/confesta/toppings.functions.ts` (`addTopping` handler, INSERT 직전)

최근 10초 이내 동일 (device_id, session_id, kind, prompt_id, text) row가 있으면 성공 응답만 반환하고 INSERT 스킵:

```ts
const sinceIso = new Date(Date.now() - 10_000).toISOString();
let dedupQ = supabaseAdmin
  .from("toppings")
  .select("id")
  .eq("device_id", data.deviceId)
  .eq("session_id", data.sessionId)
  .eq("kind", data.kind)
  .eq("text", data.text)
  .gte("created_at", sinceIso);
dedupQ = resolvedPromptId
  ? dedupQ.eq("prompt_id", resolvedPromptId)
  : dedupQ.is("prompt_id", null);
const { data: dup } = await dedupQ.limit(1).maybeSingle();
if (dup) return { ok: true as const };
```

---

## 3중 방어 시나리오

| 상황 | 방어 계층 | 결과 |
|---|---|---|
| 정상 제출 | mutation onSuccess 로컬 invalidate | 본인 화면 즉시 반영 |
| 응답 대기 중 재클릭 | 2 (버튼 pending 잠금) | 애초에 재제출 불가 |
| 브라우저 자동 재시도/새로고침 후 재전송 | 3 (서버 dedup 10초) | DB에 1건만, 성공 응답 |
| 타 청중 화면 반영 | 1 (디바운스) | 최대 3초 내 반영 |

---

## 리스크 재검토 결과

### 1. 기능 오작동 가능성

| 항목 | 판정 | 근거 |
|---|---|---|
| 본인 제출 후 리스트 반영 | 즉시 (무변화) | onSuccess invalidate가 realtime 지연과 독립적으로 동작 |
| pending 잠금 해제 | 정상 | mutation isPending은 성공/실패 모두에서 자동 false. try/catch로 예외 flow도 안전 |
| dedup 응답 shape | 동일 | `{ok:true}` 반환 → 클라이언트 파싱 무영향 |
| dedup 동시성 | 완벽 아님 | 두 요청이 밀리초 단위로 동시 도착 시 둘 다 SELECT 못 찾고 둘 다 INSERT 가능. 실사용에서 사용자 재클릭 간격(수백ms 이상)엔 첫 요청이 이미 완료돼 있어 발생 확률 낮음. 완벽 방어는 UNIQUE 제약 필요하나 정상 케이스(재작성 재제출)를 막게 되어 도입 안 함 |

### 2. 서버비 영향: 순감소

| 항목 | 변화 |
|---|---|
| DB CPU (재조회 QPS) | 이벤트당 순간 QPS 1/5 → **큰 폭 감소** |
| DB CPU (addTopping dedup SELECT) | 요청당 SELECT 1회 추가. `toppings_session_created_idx (session_id, created_at DESC)` + `toppings_device_id_idx`로 커버, `device_id` 필터가 매우 선택적. 실제 부하: 밀리초 단위, addTopping QPS 자체가 낮음 → **무시 가능** |
| Realtime WebSocket | 무변화 |
| Egress | 재조회 감소로 소폭 하락 |
| **총합** | **큰 폭 감소** |

### 3. 다른 기능에의 악영향

| 대상 | 판정 | 근거 |
|---|---|---|
| `useSessionToppings` 반환 확장 | 무영향 | 기존 소비자는 `isSubmitting` 미참조 → 구조분해 그대로 |
| 4개 realtime kind 공유 디바운스 | 대체로 무해 | prompts/gate 알림도 최대 3초 지연되지만: (a) 서버측 `addTopping`이 실제 gate로 재검증하므로 잘못된 제출은 서버에서 거절, (b) 발표자가 "이제 열었어요" 안내와 겹치는 자연스러운 텀 |
| 발표자 자신 액션 (pin/complete) | 즉시 반영 | mutation onSuccess로 로컬 invalidate. realtime과 독립 |
| 관리자 화면 | 무영향 | `list_all_toppings_admin` 사용, 디바운스 대상 아님 |
| 다른 RPC/서버 함수 | 무영향 | 손대지 않음 |

### 4. 특수 케이스 검증

- **gate 잠금 → 열림 지연**: 청중이 3초 동안 "안 열렸다"고 느낄 수 있음. 그러나 발표자가 육성으로 "이제 답변 받아요"라고 안내하는 텀이 있어 실사용상 문제 없음. 굳이 즉시 반영이 필요하면 향후 gate만 별도 짧은 디바운스로 분리 가능(계획 범위 밖).
- **네트워크 stuck**: mutation이 응답 안 오면 버튼 영구 잠김 위험. 원래도 존재하는 문제이며 realtime 지연과 무관. 별도 timeout 도입은 계획 범위 밖.
- **의도적 동일 답변 반복**: 10초 창은 짧아 정상 사용 시 걸릴 일 없음. 사용자가 정말 동일 텍스트를 10초 내 다시 보내야 하는 시나리오는 없다고 판단.

### 5. 배포/롤백
- 세 변경이 독립적 → 부분 롤백 가능.
- 1번은 상수 2줄, 2번은 참조 제거, 3번은 dedup 블록 제거. 모두 즉시 원복.
- 스키마/DB 변경 없음. 마이그레이션 불필요.

## 결론
계획대로 진행해도 **기능 회귀, 비용 증가, 타 기능 간섭** 모두 실질적 우려 없음. 승인해주시면 순서대로 적용하겠습니다.
