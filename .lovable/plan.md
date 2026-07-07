## F안: Realtime 재연결 지연 확장 + gate 폴백 통일

2000명 동시 접속 상황에서 서버 hiccup·배포 시 대량 재연결 몰림을 방지하기 위해 backoff 파라미터를 확장하고, 그로 인해 늘어난 unhealthy 창에서 REST 폴백이 몰리지 않도록 gate 폴링 주기를 다른 훅과 동일한 60s로 맞춘다.

### 변경 파일 2개

**1. `src/lib/confesta/realtime-channel.ts` (숫자 3개)**
```ts
// Before → After
const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
                       → [3000, 6000, 12000, 20000, 30000, 45000];
function jitter(ms: number, ratio = 0.2)  →  ratio = 0.5
// scheduleReconnect 1차 base
Math.random() * 2000  →  Math.random() * 8000
```

**2. `src/hooks/use-topping-gate.ts` (숫자 1개)**
```ts
// L53
refetchInterval: healthy ? false : 30_000,
                              → 60_000,
```

### 효과 (2000명 기준)
- 1차 재연결 창: 0~2s → 0~8s → 초당 재연결 요청 **1000건 → 250건 (-75%)**
- 재시도 jitter: ±20% → ±50% → peak 완화
- Unhealthy 창 최대 30s → 45s 이지만, gate 폴백 30s→60s 통일로 재연결 창 내 폴백 폴 발동 확률 최소화
- 4개 훅 REST 폴백 주기 모두 60s로 일관성 확보

### 리스크
- 기능·시그니처·이벤트 전달 로직 미변경
- 놓친 이벤트는 폴백 refetch + E안 bootstrap(15s staleTime) + optimistic update가 커버
- `subscribeOrders`/`subscribeSlots` 별도 경로 미영향
- gate 60s 폴백: presenter가 gate 상태를 조작할 때 realtime healthy 상태에선 즉시 반영. unhealthy 상태에서만 최대 60s 지연 → 게이트가 pause 성격이므로 수용 가능

### 검증
1. DevTools Network → WS 재연결 실패→성공 간격이 3~8s 창에 분포
2. Realtime 강제 종료 시 gate REST 폴 60s 주기 확인
3. `useRealtimeHealth` false→true 전환 정상
4. 재연결 후 첫 이벤트 수신 정상

### 롤백
숫자 4개 원복.
