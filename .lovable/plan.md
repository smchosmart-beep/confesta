## 원인

`src/routes/presenter.tsx`의 `day/period/room` 상태(93–95줄)가 로컬 `useState`. 새로고침 → 초기값 `null` → 114줄 auto-select 이펙트가 "첫 번째 slot"으로 강제 선택 → 이전 세션과 다른 sessionId면 PIN 잠금 쿠키(sessionId 기반)와 매칭되지 않아 다시 잠금 화면.

## 수정

선택 상태를 URL 검색 파라미터로 승격 → 새로고침·공유·뒤로가기에도 유지.

1. `createFileRoute("/presenter")`에 `validateSearch` 추가. `@tanstack/zod-adapter`의 `zodValidator` + `fallback` 사용:
   ```ts
   const searchSchema = z.object({
     day: fallback(z.coerce.number().int(), undefined).optional(),
     period: fallback(z.enum(PERIODS), undefined).optional(),
     room: fallback(z.string(), undefined).optional(),
   });
   ```
2. 컴포넌트에서 `Route.useSearch()`로 값 읽기, `useNavigate({ from: Route.fullPath })`로 쓰기. 로컬 `useState` 3개 제거.
3. 114줄 auto-select 이펙트는 유지하되 `setDay/Period/Room` 대신 `navigate({ search: (p) => ({ ...p, day, period, room }), replace: true })`. deps는 `[slots]`만 유지(무한 루프 방지).
4. RoleHeader에 넘기던 `onChangeDay/Period/Room`도 동일한 navigate 래퍼로 대체(시그니처 유지).
5. `selected` 계산은 search 값에서 파생.

## 부작용 검토(요약)

- 서버비/DB: 영향 없음(순수 클라 라우팅).
- PIN 잠금: sessionId 복원되므로 잠금 유지 상태로 곧바로 진입.
- 무한 루프: auto-select deps는 `[slots]`뿐이라 navigate로 인한 search 변경은 재실행 없음.
- 뒤로가기: `replace:true`로 히스토리 오염 없음.
- 다른 라우트/기능: 무관(파일 국소 변경).
- Period 타입: 실제 값 `"1000"|"1320"|"1530"`(`PERIODS` 상수) 사용.
