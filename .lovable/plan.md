# 청중 세션 인지 개선 계획

## 목표

1. 주문 QR 미스캔 상태에서 토핑이 엉뚱한 세션(s1 폴백)으로 전송되는 문제 차단
2. 여러 세션에 주문/수령한 청중이 현재 어느 세션에 토핑을 보내는지 명확히 알고 직접 전환할 수 있도록

## 변경 사항

### 1. `src/routes/audience.tsx` — 토핑 탭 재구성

**(A) 활성 세션 도출 로직 변경**

기존:
```
activeSessionId = 최근 수령 → 최근 주문 → SESSIONS[0]
```

신규:
- `mySessionIds = uniq([...scoops.sessionId, ...orders.sessionId])` — 청중이 실제로 스캔한 세션만
- `selectedSessionId` 로컬 state 추가 (기본값: `mySessionIds[0] ?? null`)
- `mySessionIds`가 비면 `selectedSessionId === null` → 미스캔 상태

**(B) 미스캔 상태 (mySessionIds.length === 0)**

토핑 탭 진입 시 입력 카드 대신 가드 카드 표시:
- 자물쇠/카메라 아이콘 + 헤드라인 "아직 참여 중인 세션이 없어요"
- 본문: "주문 QR을 먼저 스캔하면 해당 세션에 토핑을 보낼 수 있어요."
- CTA 버튼: "주문 탭으로 이동" → `setSection("orders")`
- `ToppingInput`은 렌더하지 않음 (전송 자체가 불가능하도록)
- "다른 사람들의 토핑" 피드도 숨김 (보여줄 세션이 없음)

**(C) 스캔 완료 상태 (mySessionIds.length ≥ 1)**

토핑 카드 상단에 세션 전환 칩(pill) 행 추가:
- `mySessionIds`를 순회하며 각 세션 제목 칩 렌더
- 선택된 칩은 `bg-grad-strawberry text-white shadow-pink`, 비선택은 `bg-white/70 border` 스타일
- 클릭 시 `setSelectedSessionId(id)` → 즉시 `ToppingInput`과 아래 피드가 그 세션으로 갱신
- 칩이 1개뿐이면 그래도 비활성 상태로 노출(현재 세션을 명시)
- 기존 "현재 세션: <strong>제목</strong>" 줄은 칩으로 대체되므로 제거

**(D) 신규 주문/수령 시 자동 추종**

`useEffect`로 `mySessionIds`가 변할 때 `selectedSessionId`가 더 이상 목록에 없으면(또는 null인데 새로 생겼으면) 최신 항목으로 설정. 이미 유효한 선택이면 건드리지 않음(사용자 의도 보존).

### 2. `src/components/confesta/ToppingInput.tsx`

변경 없음. 호출 측에서 `sessionId`가 항상 유효한 값(미스캔이면 컴포넌트 자체를 렌더하지 않음)이 되도록 보장하므로 내부 로직 변동 불필요.

### 3. 영향 없는 영역

- 주문 탭, My 콘 탭, 영수증 탭, 발표자/스태프/관리자 뷰: 수정 없음
- store, types, mockData: 수정 없음 (`selectedSessionId`는 라우트 로컬 state)
- 폴백 `SESSIONS[0]` 로직은 토핑 탭에서만 제거. My 콘 탭은 어차피 `scoops`가 비면 빈 콘이 나오므로 별도 처리 불필요.

## 기술 메모

- `mySessionIds`는 `useMemo`로 계산
- 칩 행은 가로 스크롤 가능하게 `overflow-x-auto flex gap-2` (세션이 많아질 경우 대비)
- 디자인 토큰 준수: 기존 `bg-grad-*`, `shadow-*`, `text-muted-foreground` 사용, 커스텀 색상 신규 추가 없음
