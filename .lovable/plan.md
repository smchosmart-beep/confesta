# A안 — Realtime 채널 통합 (세션당 1채널) + 리스크 검토

## 배경 (요약)
현재 `src/lib/confesta/realtime-channel.ts`는 kind별 독립 채널을 유지 → 청중 1명당 4개 WebSocket 채널. 2000명 × 4 = **8000 채널**. 4개 kind를 세션 단위 1채널로 통합하면 채널 수 75%↓.

## 변경 범위 (단일 파일)
`src/lib/confesta/realtime-channel.ts` 내부 리팩터. **공용 export 시그니처·동작 완전 불변**:
- `subscribeToppings/Prompts/Gate/ToppingComments(sessionId, cb)`
- `useRealtimeHealth(kind, sessionId)` — kind 인자 유지(시그니처 호환), 내부적으로는 세션 단위 health 반환
- `subscribeGlobalTable`(orders/session_slots) 무변경

호출부(9개 파일: use-toppings, use-answer-prompts, use-topping-gate, use-topping-comments 등) **수정 없음**.

## 새 내부 구조

```ts
type Kind = "toppings" | "prompts" | "gate" | "comments";
const KIND_TABLE: Record<Kind, TableName> = {
  toppings: "toppings",
  prompts:  "answer_prompts",
  gate:     "topping_gates",
  comments: "topping_comments",
};

interface SessionEntry {
  channel: RealtimeChannel | null;
  listenersByKind: Record<Kind, Set<() => void>>;
  healthListeners: Set<() => void>;
  refCount: number;             // 4개 kind 총합
  healthy: boolean;
  attempt: number;
  backoffTimer, initialTimer;
}
const sessionRegistry = new Map<string, SessionEntry>();
```

### buildChannel — 4개 테이블 한 채널
```ts
const ch = supabase.channel(`session:${sessionId}:singleton`);
for (const kind of KINDS) {
  ch.on("postgres_changes", {
    event: "*", schema: "public",
    table: KIND_TABLE[kind],
    filter: `session_id=eq.${sessionId}`,
  }, () => scheduleNotify(entry.listenersByKind[kind]));
}
```

### subscribe — kind별 리스너 Set만 분리, refCount는 세션 단위 합산
마지막 kind의 마지막 리스너 해제 시(=refCount 0) 채널 teardown.

### scheduleNotify — 그대로
kind별 Set이 서로 다른 WeakMap 키가 되어 디바운스가 섞이지 않음.

### useRealtimeHealth(kind, sessionId)
kind는 시그니처 호환용, 실제로는 세션 entry의 healthy 반환.

## 리스크 검토

### 1. 기능 오작동
| 항목 | 판정 | 근거 |
|---|---|---|
| 테이블별 이벤트 라우팅 | 안전 | `ch.on(..., {table})`를 4번 등록. Supabase Realtime은 각 리스너를 table 필터로 개별 dispatch. 기존 4채널 구조도 채널 내부에선 같은 방식 |
| kind별 디바운스 독립성 | 유지 | `notifyTimers = WeakMap<Set, timer>`. kind별 Set이 서로 다른 인스턴스 → 디바운스 큐가 섞이지 않음 |
| refCount 생명주기 | 정상 | 4 kind 총합. 마지막 unsubscribe에서만 teardown. 부분 kind 해제 시 채널 유지 |
| 초기 subscribe 순서 | 정상 | 첫 kind 구독에서 채널 생성, 이후 kind는 기존 채널의 listener Set에만 추가 (재구독 X) |
| 재접속(backoff) | 정상 | 세션 단위로 통일. `scheduleReconnect(sessionId)`가 세션 entry만 재빌드 |
| health 통합 | 무해 | 세션당 채널 1개이므로 세션 health = 채널 health. `useRealtimeHealth(kind, sid)` 호출부는 kind 값과 무관하게 세션 상태만 보면 됨 |
| SSR fallback | 무변화 | `useSyncExternalStore`의 서버 스냅샷 `true` 유지 |

### 2. 서버비 영향 — 순감소
| 항목 | 변화 | 이유 |
|---|---|---|
| Realtime WebSocket 채널 수 | **75%↓ (8000→2000)** | 세션당 1채널 |
| Realtime 서버 CPU/메모리 | 감소 | 채널 관리·filter 매칭 부담 축소 |
| DB 이벤트 발생 | 무변화 | postgres_changes는 DB WAL 기반, 채널 통합과 무관 |
| Egress(payload 총량) | 무변화 | 이벤트 개수·크기 동일 |
| 재접속 폭풍(장애 복구 시) | 1/4로 완화 | 재접속 시도 수 자체가 세션당 1 |

**주의**: 세션당 채널이 4배 많은 이벤트를 받게 되지만, 원래 이 이벤트들은 별도 채널로 어차피 브라우저에 도달하고 있었음. 총 트래픽은 동일하며 오히려 WebSocket 프레임 헤더 오버헤드가 통합만큼 감소.

### 3. 다른 기능 영향
| 대상 | 판정 |
|---|---|
| 9개 호출부(use-toppings 등) | 무영향 — export 시그니처·동작 동일 |
| `subscribeGlobalTable` (orders/session_slots, 관리자·발표자용) | 무영향 — 손대지 않음 |
| 좋아요 팬아웃 억제 (`topping_likes` publication 제외) | 무영향 — 별개 최적화 |
| 재조회 디바운스 상향 (1~3초) | 무영향 — `scheduleNotify` 로직 그대로 |
| 서버 dedup / 제출 pending 잠금 | 무영향 — 서버 함수/컴포넌트 무관 |
| 관리자 화면(`list_all_toppings_admin`) | 무영향 — realtime 미사용 |

### 4. 특수 케이스
- **동일 세션 다중 탭**: 탭당 별도 entry(브라우저 인스턴스 분리) → 정상.
- **세션 전환**: 이전 세션 refCount 0 → teardown, 새 세션 신규 entry → 정상.
- **health 리스너만 남고 데이터 리스너 다 해제**: 기존 코드와 동일하게 data listener가 lifetime 지배(health 리스너는 tear-down 유발 안 함).
- **버그 시나리오**: `listenersByKind` 초기화를 `ensureEntry` 시 반드시 4개 빈 Set으로 채워야 함. 누락 시 `undefined.add` 런타임 오류 — 초기화 코드에 명시.

### 5. 롤백
파일 1개만 이전 커밋으로 되돌리면 즉시 복구. 다른 파일·스키마 변경 없음.

## 배포 후 검증
1. DevTools → Network → WS: 세션 진입 후 WebSocket 채널이 세션당 **1개**만 열리는지 확인 (`session:{sid}:singleton`).
2. 발표자 pin/complete → 청중 화면 반영 (최대 3초 내)
3. 답변 프롬프트 open/close → 청중 알림
4. gate 열림/닫힘 → 입력창 활성/비활성 전환
5. 답변 카드 열림 시 댓글 실시간 반영
6. 네트워크 오프라인→온라인 토글 시 재접속 및 `useRealtimeHealth` 상태 복구

## 결론
- **기능 오작동**: 없음 (라우팅·디바운스·생명주기 검증 완료)
- **서버비**: 순감소 (Realtime 75%↓, DB/Egress 무변화)
- **타 기능 악영향**: 없음 (공용 API 시그니처·동작 불변)

승인해주시면 진행하겠습니다.
