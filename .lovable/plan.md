# 리얼타임 구조 개선 (청중 최대 1,520명 동시 접속 대응)

## 목표

학회 행사 시 청중 동시 접속(개막식 1,020명 / 평상시 최대 ~1,520명)에서 리얼타임 구독이 안정적으로 동작하도록, **채널 수와 fanout 비용을 줄이고** Lovable Cloud 인프라 한도를 확보합니다.

## 행사 규모 (실측)

- 가장 큰 강의장: 600명
- 두번째: 240명
- 세번째: 180명
- 나머지 10개 강의장: 약 50명씩 (합계 ~500명)
- **개막식 피크**: 600 + 240 + 180 = **1,020명** (한 세션에 집중)
- **평상시 최대**: 모든 강의장 동시 진행 시 = **약 1,520명**
- Realtime 동시 연결 한도는 프로젝트 전체(전역) 기준이므로 세션별로 합산됨

## 현재 문제 (개선 전)

- 청중 1명 = WebSocket 1개 + 채널 ~5개 (`toppings`, `topping_likes`, `prompts`, `gate`, `slide_state`, device-필터 `my-toppings`)
- 좋아요 폭주 시 `topping_likes` INSERT가 청중 전원에게 fanout → 서버 CPU(RLS·필터 평가) 병목
- Nano 인스턴스 기본 Realtime 동시 연결 한도 ~200개

## 변경 사항 (코드) — ✅ 모두 적용 완료

### 1. `topping_likes` 리얼타임 구독 제거 ✅
파일: `src/lib/confesta/realtime-channel.ts`

- `KIND_TABLES.toppings`에서 `{ table: "topping_likes" }` 제거
- 좋아요 카운트는 `toggle_topping_like` RPC가 `toppings.likes`를 UPDATE하므로 `toppings` 채널 하나로 충분
- **효과**: 채널당 이벤트 수 절반, fanout 대상 절반

### 2. `subscribeMyToppings` 글로벌 구독 제거 ✅
파일: `src/hooks/use-my-toppings.ts`, `src/lib/confesta/realtime-channel.ts`, `src/hooks/use-toppings.ts`

- 글로벌 `toppings` 채널 + `device_id` 필터 구독 제거
- 대체: `addTopping`, `deleteOwnMut` `onSuccess`에서 `qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] })`
- **효과**: 청중 1인당 채널 1개 감소 → 1,520명 기준 약 1,520채널 절감

### 3. `topping_likes` Realtime publication에서 DROP ✅
마이그레이션: `20260613042119_*.sql`

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.topping_likes;
```

- 서버에서 WAL→Realtime 변환 비용 자체 제거

### 4. 채널 핸들러 200ms trailing 디바운스 ✅
파일: `src/lib/confesta/realtime-channel.ts`

- `notifyAll(entry.listeners)`를 200ms trailing 디바운스로 합침 → React Query refetch 횟수 감소

## 변경 사항 (인프라)

### 5. Realtime 동시 연결 한도 (인스턴스 사이즈로 결정됨)

Lovable Cloud Realtime 동시 연결 한도는 인스턴스 컴퓨트 티어에 종속됨:

| 티어 | 대략적 동시 연결 한도 |
|---|---|
| Nano (현재) | ~200 |
| Micro | ~200 |
| Small | ~500 |
| Medium | ~500 |
| Large | ~1,000 |
| **XL (결정)** | **~3,000** |
| 2XL | ~5,000 |
| 4XL | ~10,000 |

- 개막식 피크 1,020명 + 재접속 버퍼 → Large(1,000)는 마진 부족, **XL 선택**
- XL은 Postgres direct connections, 풀 연결, CPU/RAM도 함께 상향됨

### 6. 인스턴스 사이즈: **XL로 업그레이드 (선조치)**

- 위치: Cloud → Overview → Advanced settings → Upgrade instance
- 업그레이드 후 `ACTIVE_HEALTHY` 상태 확인 필요
- 비용은 행사 시즌에만 XL 유지하고, 평시 Nano로 다운그레이드하는 운영도 가능

## 실행 순서

1. ✅ 코드 개선 #1~#4 적용 (완료)
2. ⏳ **인스턴스 XL 업그레이드** (Cloud 대시보드에서 수동)
3. ⏳ 업그레이드 후 부하 테스트로 실 한도 검증 (1,500~2,000 WS 세션)
4. 필요 시 추가 튜닝 (Broadcast 전환 등 후속 항목 검토)

## 검증

부하 테스트 (`artillery` 또는 Node 스크립트로 1,500~2,000 WS 세션 시뮬레이션):
- 평균 latency / 연결 실패율
- `toppings` INSERT 후 클라이언트 수신까지 시간

운영 중 모니터링 지표:
- Cloud 대시보드 Realtime: connected clients, messages/s
- Postgres: direct/pool connections (XL 한도 대비 사용률)
- 인스턴스: CPU / 메모리 사용률
- OOM kill, deadlock, rolled-back transaction 증가 여부

## 영향 없음 / 호환성

- 좋아요 카운트는 `toppings.likes` UPDATE 경유로 그대로 실시간 반영
- 본인 토핑 목록은 mutation onSuccess invalidate로 즉시 갱신
- 영수증에는 likes 표시가 없으므로 stale 문제 없음
- 발표자/관리자 화면(`QuestionStream`, `StageMarquee`, `BackgroundToppings`)은 `subscribeToppings`만 사용 → 영향 없음
- `topping_likes` CASCADE 삭제는 publication과 무관, 정상 동작
- prompts/gate/slide_state 채널은 변경 없음

## 비용 영향

| 항목 | 비용 방향 |
|---|---|
| #1 `topping_likes` 채널 제거 | ↓ WS 메시지 절반 |
| #2 `my-toppings` 글로벌 채널 제거 | ↓↓ 청중당 1채널 + INSERT마다 device 필터 평가 제거 |
| #3 publication DROP | ↓ WAL→Realtime 변환 비용 제거 |
| #4 디바운스 | ↓ React Query refetch 횟수 감소 |
| #6 XL 인스턴스 업그레이드 | ↑ 월 고정비 (행사 기간 한정 운영 권장) |

## 후속 (이번 plan 범위 밖)

- 장기적으로 `postgres_changes` → Realtime **Broadcast** 전환 (presenter가 명시적으로 publish)으로 fanout 비용을 O(구독자수)에서 O(메시지)로 낮춤
