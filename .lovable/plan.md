## 3라운드 정밀 재검토 결과: 신규 리스크 없음

이번 라운드에서 새로 점검한 잠재 위험 항목과 판정입니다.

| 신규 점검 항목 | 판정 | 근거 |
|---|---|---|
| `list_toppings_with_my_like_v2(NULL)` 서브셋 차이 | 없음 | RPC의 `WHERE r.kind = 'answer' OR r.pinned OR r.addressed OR r.rn <= _limit`는 deviceId 무관 → 반환 row 집합 동일 |
| `topping_likes` 개인 조회 부하 | 미미 | 사용자당 인덱스된 `(session_id, device_id)` SELECT 1회, 결과 수십행 이하 |
| RLS 우회 걱정 | 없음 | 기존과 동일하게 `supabaseAdmin` 사용, 신규 노출 없음 |
| 워커 isolate 캐시 수명 | 안전 | evict돼도 "캐시 없음"이라 기존 동작으로 자연 폴백 |
| 캐시 메모리 누수 | 없음 | 활성 세션 수 = 항목 수. 리허설/행사 규모(수 개) 기준 무시 가능 |
| 자기 좋아요 직후 재진입 | 안전 | 클라이언트 `likeGuards` TTL이 자기 클릭을 보호. `likedByMe`는 항상 실시간 개인 조회라 정확 |
| 타인의 좋아요 5초 지연 | 허용 | Realtime UPDATE 이벤트가 즉시 도착해 UI 갱신. bootstrap 캐시는 새로 진입한 사용자에게만 잠깐 stale count 노출 |
| SSR QueryClient 오염 | 없음 | 캐시는 서버 워커의 별도 심볼. Query의 요청별 client와 무관 |
| Realtime 이벤트 순서 뒤바뀜 | 없음 | 채널 로직 무변경. bootstrap이 잠깐 stale이어도 이후 이벤트가 최신 상태로 수렴 |
| presenter/audience 훅 시그니처 | 무영향 | `bootstrapSession` 입출력 shape 100% 동일 |
| `mine` 필드 유출 | 없음 | 요청별 재계산, 캐시엔 raw `device_id`만 저장 |
| Promise가 5초 넘게 걸리는 경우 | 안전 | single-flight로 동시 요청은 같은 promise 공유. 완료 시점에 이미 stale이면 다음 요청이 재생성(경미한 재조회, 오작동 아님) |
| 배포/롤백 | 안전 | 파일 1개 변경 → 문제 시 즉시 revert 가능, DB/스키마 변경 없음 |

## 최종 실행 계획 (확정, 변경 없음)

### 1단계: 콘솔 (사용자)
- Cloud → Advanced settings에서 DB 인스턴스 사이즈 현재값 확인만.
- 리허설 중 Memory 80%↑ 또는 Connections 45↑ 발생 시에만 상향.

### 2단계: 코드 (제가 구현) — `src/lib/confesta/session-bootstrap.functions.ts` 단일 파일

**공용 캐시(sessionId 키, TTL 5s, Promise single-flight)**:
- `toppingsRaw[sessionId]`: `list_toppings_with_my_like_v2(sessionId, NULL, 100)` 결과의 raw rows(`device_id`, `likes`, `liked_by_me=false` 포함)
- `prompts[sessionId]`, `gate[sessionId]`, `commentCounts[sessionId]`: 기존 로더 결과 그대로

**개인 조회(캐시 없음)**:
- `topping_likes`에서 `session_id = sessionId AND device_id = deviceId` SELECT → `Set<topping_id>`

**응답 조립**:
- raw rows 순회하며 `likedByMe = likedSet.has(row.id)`, `mine = row.device_id === deviceId`로 개인화
- 반환 shape/errors 필드 100% 동일 → 호출부(`use-session-bootstrap.ts`, `presenter.tsx`, `audience.tsx`) 무수정

**캐시 구현 규칙**:
- `globalThis.__confesta_bootstrap_cache__`에 `Map` 저장
- 각 항목: `{ promise, expiresAt }`. 조회 시 `now < expiresAt`이면 재사용, 아니면 새 promise로 교체
- Promise reject 시 `.catch`에서 해당 키 delete(에러 캐싱 금지)
- 기존 `Promise.allSettled` 격리 유지

### 3단계: 검증
- 빌드/타입체크 통과
- 다른 deviceId 2개로 5초 이내 동일 세션 진입 → `mine`/`likedByMe` 각자 정확, 공용 쿼리 1회만 실행
- 좋아요/pin/해결 조작 시 Realtime 이벤트로 UI 즉시 갱신 확인

## 하지 않는 것
- 좋아요 코드 변경 / 새 마이그레이션 / Realtime 요금제 조정 / edge 캐시 헤더 조정

## 확인 필요
공용 캐시 TTL **5초** vs **3초** 중 선택 부탁드립니다. 5초가 스파이크 완화 효과 최대, 3초는 관리자 조작 반영이 조금 더 빠릅니다(Realtime 이벤트는 어차피 즉시).
