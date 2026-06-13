# 리얼타임 구조 개선 (청중 2000명 동시 접속 대응)

## 목표

청중 2000명 동시 접속 시 리얼타임 구독이 안정적으로 동작하도록, **채널 수와 fanout 비용을 줄이고** Lovable Cloud 인프라 한도를 확보합니다.

## 현재 문제

- 청중 1명 = WebSocket 1개 + 채널 ~5개 (`toppings`, `topping_likes`, `prompts`, `gate`, `slide_state`, device-필터 `my-toppings`)
- 2000명 = WebSocket 2,000개 + 채널 ~10,000개
- 좋아요 폭주 시 `topping_likes` INSERT가 청중 전원에게 fanout → 서버 CPU(RLS·필터 평가) 병목
- 기본 동시 연결 한도 500개 (Pro)

## 변경 사항 (코드)

### 1. `topping_likes` 리얼타임 구독 제거
파일: `src/lib/confesta/realtime-channel.ts`

- `KIND_TABLES.toppings`에서 `{ table: "topping_likes" }` 제거
- 좋아요 카운트는 `toggle_topping_like` RPC가 `toppings.likes`를 UPDATE하므로 `toppings` 채널 하나로 충분
- **효과**: 채널당 이벤트 수 절반, fanout 대상 절반

### 2. `subscribeMyToppings` 글로벌 구독 제거
파일: `src/hooks/use-my-toppings.ts`, `src/lib/confesta/realtime-channel.ts`, `src/hooks/use-toppings.ts`

- "My 콘" 영수증 화면은 본인 토핑 추가/삭제 시점만 알면 됨
- 글로벌 `toppings` 채널 + `device_id` 필터 구독 제거
- 대체: `use-toppings.ts`의 `addTopping`, `deleteOwnMut` `onSuccess`에 `qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] })` 추가
- `togglePin`/`toggleAddressed`/`toggleLike`는 my-toppings invalidate 불필요 (영수증은 likes/pinned/addressed를 표시하지 않음)
- **효과**: 청중 1인당 채널 1개 감소 → 2000명에서 2,000채널 절감

### 3. `topping_likes` Realtime publication에서 제거 (마이그레이션)

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.topping_likes;
```

- 1번에서 클라이언트 구독을 끊어도 publication에 남아있으면 서버는 계속 변경 이벤트를 직렬화함
- publication에서 빼면 INSERT/DELETE 시 WAL→Realtime 변환 비용 자체가 사라짐

### 4. 채널 핸들러 디바운스
파일: `src/lib/confesta/realtime-channel.ts`

- `notifyAll(entry.listeners)`를 200ms trailing 디바운스로 감싸 폭주하는 invalidation을 합침
- React Query refetch 횟수 감소 → 서버 read 부하 감소
- 발표자 화면 질문 표시 지연 +200ms (체감 무시)

## 변경 사항 (인프라)

### 5. Lovable Cloud Realtime 동시 연결 한도 상향 (필수)
- 현재 기본 500 → 2,500+ 요청 필요
- 한도 자체가 막히므로 필수
- Cloud 대시보드에서 설정 (코드 변경 없음)

### 6. 인스턴스 사이즈 업 (보류, 부하 테스트 후 결정)
- 코드 개선(#1~#4) 적용 후 부하 테스트 결과를 보고 결정
- 선조치하지 않음 — 월 고정비 증가가 가장 큰 비용 항목

## 검증

- `artillery` 또는 간단한 Node 스크립트로 1,000~2,000개 WS 세션 시뮬레이션:
  - 평균 latency
  - 연결 실패율
  - `toppings` INSERT 후 클라이언트 수신까지 시간
- 운영 중 측정: Cloud 대시보드 Realtime 메트릭(connected clients, messages/s)

## 영향 없음 / 호환성

- 좋아요 카운트는 그대로 실시간 반영됨 (`toppings.likes` UPDATE 경유)
- 본인 토핑 목록은 mutation onSuccess invalidate로 즉시 갱신됨
- 영수증에는 likes 표시가 없으므로 타인 좋아요 stale 문제 없음
- 발표자/관리자 화면(`QuestionStream`, `StageMarquee`, `BackgroundToppings`)은 `subscribeToppings`만 사용 → 영향 없음
- `admin`의 토핑 삭제 시 `topping_likes` CASCADE 삭제는 publication과 무관, 정상 동작
- prompts/gate/slide_state 채널은 변경 없음

## 비용 영향

| 항목 | 비용 방향 |
|---|---|
| #1 `topping_likes` 채널 제거 | ↓ WS 메시지 절반 |
| #2 `my-toppings` 글로벌 채널 제거 | ↓↓ 청중당 1채널 + INSERT마다 device 필터 평가 제거 |
| #3 publication DROP | ↓ WAL→Realtime 변환 비용 제거 |
| #4 디바운스 | ↓ React Query refetch 횟수 감소 |
| #5 Realtime 연결 한도 상향 | ↑ Pro connections add-on |
| #6 인스턴스 사이즈 업 | (보류) |

## 후속 (이번 plan 범위 밖)

- 장기적으로 `postgres_changes` → Realtime **Broadcast** 전환 (presenter가 명시적으로 publish)으로 fanout 비용을 O(구독자수)에서 O(메시지)로 낮춤
