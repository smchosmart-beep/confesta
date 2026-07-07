# E안 (최종) — 세션 초기 로드 batch (bootstrapSession)

## 목표
세션 진입 시 각 클라이언트가 3~4회씩 발사하던 서버함수 호출을 **1회 batch RPC**로 통합. 2000명 동시 진입 스파이크 **-66~75%**.

## 확정 사실 (코드 실측)

- audience.tsx 세션 진입 시 발사: `listToppings` + `listAnswerPrompts` + `listToppingComments` (댓글 블록이 토핑마다 마운트되지만 캐시키가 세션 단위라 1회로 dedup).
- presenter.tsx는 위 3건 + `getToppingGate` = 4건.
- 캐시 키 (정확한 값):
  - `["toppings", sessionId, deviceId]`
  - `["prompts", sessionId]`
  - `["gate", sessionId]`
  - `["topping-comments", sessionId, deviceId]`
- toppings/comments 서버함수는 `deviceId`로 `likedByMe`·`mine`을 계산.

## 접근

### 1. 신규 서버함수 `bootstrapSession`
- 파일: `src/lib/confesta/session-bootstrap.functions.ts`
- 입력: `{ sessionId: string, deviceId: string }`
- 내부: `Promise.allSettled`로 기존 4개 조회를 병렬 실행. 실패는 필드별로 격리해 `errors[k]`에 기록.
- 반환:
  ```ts
  {
    toppings?: { toppings: ToppingDTO[] }
    prompts?: { prompts: AnswerPromptDTO[] }
    gate?: ToppingGateDTO
    comments?: { comments: CommentDTO[] }
    errors: { toppings?: string; prompts?: string; gate?: string; comments?: string }
  }
  ```
- 재사용 대상: `listToppings`, `listAnswerPrompts`, `getToppingGate`, `listToppingComments` 의 **내부 구현(서버 헬퍼 함수)** 을 직접 호출. `$`-prefixed RPC 스텁을 서버 내부에서 다시 호출하지 않도록 각 파일에서 순수 헬퍼를 export 하거나, 서버함수 handler에서 supabase 클라이언트로 동일한 쿼리를 직접 수행.
- 인증: anon(기존 4개 함수와 동일).
- 새 DB 쿼리·정책·grant 없음.

### 2. 신규 훅 `useSessionBootstrap`
- 파일: `src/hooks/use-session-bootstrap.ts`
- 형태:
  ```ts
  const qc = useQueryClient();
  const deviceId = useDeviceId();
  const bootFn = useServerFn(bootstrapSession);
  useQuery({
    queryKey: ["session-bootstrap", sessionId, deviceId] as const,
    queryFn: async () => {
      const r = await bootFn({ data: { sessionId: sessionId!, deviceId: deviceId! } });
      // 원자적 시딩: queryFn 내부에서 setQueryData (v5는 onSuccess 미지원)
      if (r.toppings) {
        qc.setQueryData(["toppings", sessionId, deviceId], {
          ...r.toppings,
          toppings: applyLikeGuards(sessionId!, deviceId, r.toppings.toppings),
        });
      }
      if (r.prompts) qc.setQueryData(["prompts", sessionId], r.prompts);
      if (r.gate) qc.setQueryData(["gate", sessionId], r.gate);
      if (r.comments) qc.setQueryData(["topping-comments", sessionId, deviceId], r.comments);
      return r;
    },
    enabled: !!sessionId && !!deviceId,   // 보완 ①
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  ```
- `applyLikeGuards`는 use-toppings.ts에서 export 형태로 노출(현재 모듈 내 private) → **최소 변경**: 함수를 export만 추가.

### 3. 호출 지점 (라우트 2곳)
- `src/routes/audience.tsx`: `activeSessionId` 계산 직후 `useSessionBootstrap(activeSessionId)` 1줄.
- `src/routes/presenter.tsx`: `AnswerPromptTabs` 진입부 또는 `SessionPresenter`에서 `useSessionBootstrap(sessionId)` 1줄.

기존 4개 훅과 컴포넌트는 **손대지 않음**.

## 3건 보완 (계획에 반영)

### ① deviceId 준비 이전에 실행되지 않도록 게이팅
`enabled: !!sessionId && !!deviceId`. 없으면 캐시 키 불일치로 시딩이 무효.

### ② likeGuards를 시딩 경로에 적용
toppings 시딩 전에 `applyLikeGuards(sessionId, deviceId, toppings)` 통과. 사용자의 직전 좋아요 값이 서버 카운트로 되돌려지지 않도록.

### ③ TanStack Query v5 대응 (onSuccess 미사용)
`queryFn` 내부에서 fetch 직후 `setQueryData` 호출. `onSuccess` 콜백 사용 금지.

### (부수 정정) 캐시 키
`["topping-comments", sessionId, deviceId]` — 초기 초안의 `["comments", ...]` 오류 수정.

## 서버비/성능 영향

| 항목 | 변화 |
|---|---|
| 세션 진입 서버함수 호출 수 | audience 3→1 (-66%), presenter 4→1 (-75%) |
| DB 총 쿼리 수 | 동일 (bootstrap 내부 병렬) |
| PostgREST/함수 라우팅 오버헤드 | 감소 |
| Realtime | 무변화 |
| Cloud CPU | 감소 |
| 대역폭 | 소폭 감소 (HTTP 헤더 절감) |

과다 부과 요인 없음.

## 다른 기능 영향

| 대상 | 판정 | 근거 |
|---|---|---|
| A안(realtime payload 패치) | 정합 | 캐시 shape 100% 동일, 세팅 시점만 앞당김 |
| 좋아요 낙관/가드/쿨다운 | 안전 | 보완 ② |
| pin/addressed 낙관 토글 | 안전 | mutation 확정값이 우선 |
| addTopping/deleteOwn 이후 invalidate | 무영향 | bootstrap 키와 별개 |
| useAudience / useMyToppings | 무영향 | 별도 스코프 |
| BackgroundToppings·WordCloud·StageMarquee·AnswerPie | 무영향 | 시딩된 캐시 즉시 소비 |
| 채널 통합·comments REPLICA IDENTITY FULL | 정합 | 무관 |
| 관리자 뷰 | 무영향 | bootstrap 미대상 |

## 특수 케이스

- **부분 실패**: `errors[k]`가 있는 키는 시딩 스킵 → 해당 훅이 자체 fetch로 자동 폴백. 전체 백지화 없음.
- **staleTime 3초의 gate**: 진입 스파이크 흡수 후 3초 뒤 stale → 훅이 자체 fetch 1회. 부하 관점 문제없음.
- **세션 전환**: 새 sessionId로 bootstrap 재실행. 15초 내 동일 세션 재진입은 캐시 히트.
- **오프라인 진입**: bootstrap 실패 → 하위 훅이 각자 폴백 fetch 시도.
- **다중 탭**: 각 탭 자체 QueryClient → 각 탭 1회씩. 정상.

## 변경 파일

1. **신규** `src/lib/confesta/session-bootstrap.functions.ts`
2. **신규** `src/hooks/use-session-bootstrap.ts`
3. **수정** `src/hooks/use-toppings.ts` — `applyLikeGuards` export 추가만 (로직 무변경)
4. **수정** `src/routes/audience.tsx` — 훅 호출 1줄
5. **수정** `src/routes/presenter.tsx` — 훅 호출 1줄

DB 마이그레이션 없음.

## 검증

1. Network: 세션 진입 시 `_serverFn/*` 3~4건 → **1건(bootstrap)** 확인.
2. 좋아요·핀·해결·삭제·질문 작성·프롬프트 open/close 정상 반영.
3. Realtime 이벤트로 리스트/게이트/프롬프트/댓글 갱신 (기존 A안 경로).
4. 15초 내 세션 재진입: bootstrap 재호출 없이 캐시 히트.
5. `applyLikeGuards` 활성 시 좋아요 값 유지.
6. 강제 부분 실패(테스트): 해당 훅만 자체 fetch로 복구, 다른 캐시는 그대로 사용.

## 롤백

5개 파일 revert (신규 2 삭제 + use-toppings export 제거 + 라우트 2 원복). 기존 훅 무변경 → 자연 복구.

## 이후 이어질 최적화

E안 완료 후 F안(재연결 리싱크 랜덤 지연) → G안(댓글 opt-in 구독).
