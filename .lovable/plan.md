## 목표
Admin 평면도 위에 **Day(1/2) × 시간대(오전/오후)** 필터를 추가하고, 선택된 분류에 해당하는 세션만 각 공간 카드에 표시합니다.

## 작업

### 1. `src/routes/admin.tsx` — 필터 상태 추가
- `useState<number>` `selectedDay` (기본: `SESSIONS[0].day`)
- `useState<"am" | "pm">` `selectedPeriod` (기본: 첫 세션의 시간대)
- presenter.tsx의 Day/AM-PM Select 패턴(이미 동일 컴포넌트 사용 중)을 그대로 재사용 — `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` + `selectTriggerCls` 등.

### 2. 세그먼트 UI 배치
- "행사 공간 배치도 (LEWEST 4F)" 헤더와 Legend(주문 QR/수령 QR) 사이에 새 행 삽입.
- 좌측: Day 선택 (Day 1 / Day 2) — `SESSIONS`에서 distinct day 추출.
- 우측: 시간대 선택 (오전 / 오후) — 선택된 day 안에서 실제 존재하는 시간대만 노출.
- 모바일에서는 두 select가 세로 스택, 데스크톱에서는 가로 2열.

### 3. 세션 필터링 로직
- 현재 `stats` 계산은 `SESSIONS.find((s) => s.room === roomLabel)`로 공간 → 단일 세션을 매칭.
- 이를 `SESSIONS.filter((s) => s.room === roomLabel && s.day === selectedDay && period(s) === selectedPeriod)`로 변경 (room당 동일 분류엔 보통 1세션이므로 `find` 유지하되 조건만 보강).
- 매칭 세션이 없으면 카드의 sessionTitle은 "—"로 표시 (기존 동작 유지).

### 4. 합계 카드(주문/수령) 의미
- 필터 적용 후 보이는 세션들 기준으로 totals 재계산 → 선택된 분류의 합계가 직관적으로 보이도록.

## 변경 파일
- `src/routes/admin.tsx` (단일 파일 수정)

비고: 주문 QR 발급 패널 작업은 이전 계획대로 별도 단계로 진행합니다.
