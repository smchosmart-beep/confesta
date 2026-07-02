## 부작용 검토

### 1) 기능 오작동 리스크

- **R1. 정상 사용자가 700ms 내 재탭으로 "좋아요 → 취소"를 의도한 경우**  
  현재 UX상 하트는 토글이지만, 700ms 내 연타는 실질적으로 의도 구분이 어렵고, 이전 리포트에서 실제 문제도 이 구간에서 발생. 700ms는 debounce(600±200ms)와 근사해 자기 이벤트 재조회를 자연스럽게 흡수. → **수용 가능**.  
  보정: 쿨다운을 500ms로 낮추면 의도 취소 케이스와의 균형이 나아짐. **500ms로 조정**해 반영.

- **R2. `onMutate`에서도 쿨다운 확인 → 낙관 업데이트 스킵**  
  두 번째 탭이 스킵되면 UI 변동 없음. 서버·DB도 무변경. 첫 탭 결과와 완전히 일치. 정합성 문제 없음.

- **R3. `mutationFn`이 스킵 반환하는 경로에서 컨텍스트가 비어 있어 `onError`/`onSuccess` 접근 시 에러**  
  현재 `onError`는 `if (!ctx) return`, `onSuccess`는 `skipped` 조기 반환으로 안전. → 문제 없음.

- **R4. 모바일 `onTouchEnd preventDefault`로 인한 접근성 저하**  
  버튼은 여전히 `onClick`으로 동작. iOS/Android 모두 tap → click 경로가 살아 있음. 스크린리더/키보드 접근성 무영향(`aria-*` 유지). preventDefault는 합성 click 이중 발화만 억제. → 문제 없음.

- **R5. 다른 화면의 같은 훅 사용처(발표자·관리자)**  
  `use-toppings.ts`의 `toggleLike`는 발표자 스포트라이트 등 다른 곳에서도 잠재 사용 가능. 데스크톱 클릭 환경에서는 700ms(→500ms) 쿨다운이 UX 저해 거의 없음(더블클릭 취소 시나리오만 지연). → 수용 가능.

- **R6. `SlotToppingsModal`(관리자 무제한 조회 경로)**  
  자체 훅/쿼리키를 사용, `toggleLike` 미사용. → 무영향.

### 2) 서버비/부하 리스크

- 쿨다운으로 오히려 중복 RPC 호출이 감소 → **서버비 절감 방향**.
- Realtime 이벤트/refetch 정책 변경 없음. Storage/Edge 호출 없음.
- 인덱스/스키마/RLS 무변경.

### 3) 다른 기능 회귀 리스크

- pin/addressed는 별도 헬퍼(`optimisticToggleField`)를 사용, 이번 변경 대상 아님 → 무영향.
- 댓글, 키워드 응답 집계, 워드클라우드, 관리자 무제한 조회, 발표자 게이트 등 무관.
- `onSuccess`의 Like Guard(2s) 로직도 유지 → Realtime 재조회 덮어쓰기 방지 특성 그대로.

### 4) 확정 보정 사항

- **B1. 쿨다운 700ms → 500ms** 로 축소해 의도적 취소 케이스와의 균형 확보.
- **B2. `onMutate`에도 동일 쿨다운 체크**를 넣어 낙관 UI 이중 반전을 원천 차단.
- **B3. 모바일 `onTouchEnd preventDefault`는 청중 화면의 하트 버튼에만 우선 적용**(스코프 최소화). 발표자/관리자 뷰의 다른 좋아요 UI는 이번 변경 범위 제외.

## 최종 계획(보정 반영)

### `src/hooks/use-toppings.ts`
- 모듈 수준 `lastLikeAt = new Map<string, number>()` (key = `sessionId:deviceId:toppingId`).
- 상수 `LIKE_COOLDOWN_MS = 500`.
- `toggleLike.mutationFn` 시작 지점:
  - `now - (lastLikeAt.get(k) ?? 0) < LIKE_COOLDOWN_MS` → `{ ok: false, skipped: true }` 즉시 반환.
  - 통과 시 `lastLikeAt.set(k, now)` 후 기존 `inflightLikes`/RPC 로직 실행.
- `toggleLike.onMutate`:
  - 동일 쿨다운 확인. 쿨다운 중이면 스냅샷/낙관업데이트 없이 `{ snapshots: [] }` 반환.
- `onSuccess`/`onError`: 기존 로직 유지(스킵/빈 컨텍스트 안전 처리 확인).

### `src/routes/audience.tsx`
- 청중 질문 목록의 하트 `<button>`에 `onTouchEnd={(e) => e.preventDefault()}` 추가.
- 그 외 마크업/스타일/접근성 속성 변경 없음.

파일 2개, DB/RPC/RLS 변경 없음, 롤백 용이.