## 검토 결과 요약
계획대로 적용해도 서버비 증가, DB 접근, 다른 기능 회귀는 발생하지 않습니다. 다만 실제 구현 시 아래 세부 리스크를 반드시 반영해야 첫 뒤로가기 가드가 안정적으로 작동합니다.

## 항목별 검토

### 1. 서버비/DB
- 브라우저 History API + sonner 토스트만 사용. `createServerFn`, Supabase 호출, realtime 채널 어느 것도 추가 호출 없음.
- 기존 `placeOrder`/`pickup` 호출량 변화 없음(같은 QR 1회 처리는 `processedQrRef`로 이미 잠금).
- 결론: **청구 영향 0**.

### 2. TanStack Router와의 상호작용
- `navigate({ to: '/audience', search: {}, replace: true })`는 내부적으로 `history.replaceState`를 호출. 그 **뒤에** sentinel `pushState`를 넣어야 sentinel이 덮이지 않음. 현재 코드의 `setTimeout(..., 0)` 순서는 유지 필요.
- sentinel push 후 `popstate`가 발생해도 URL이 동일(`/audience`)하므로 라우터는 같은 route를 재매치할 뿐 loader 재실행/추가 fetch를 유발하지 않음. `useQuery` 기반 데이터는 캐시 재사용.
- 리스너 안에서 `navigate`를 호출하지 않고 `history.pushState`만 사용하므로 라우터 상태와 무관하게 동작.

### 3. 다른 라우트로 이동한 뒤의 부작용
- 사용자가 `/audience` → `/admin`/`/presenter`/`/staff`로 이동한 후 뒤로가기하면 `/audience`로 복귀. 그 다음 뒤로가기에서 sentinel이 pop되면 가드가 발동해 “한 번 더 뒤로” 토스트가 뜸.
- 이는 QR로 진입한 세션에서 원하는 UX(탭 종료 방지)와 일관되므로 문제 없음. 단, 리스너가 `pathname !== '/audience'`일 때는 반드시 no-op이어야 함(현재 코드 준수).

### 4. StrictMode 이중 실행
- `backGuardInstalled = useRef(false)` + `setTimeout` cleanup 조합으로 sentinel이 두 번 쌓이지 않음. 유지 필요.

### 5. 페이지 새로고침 / iOS Safari 스와이프
- 새로고침 후에는 `?qr=`가 없으므로 가드 미설치. 남은 sentinel이 있어도 첫 back은 URL 변화 없는 pop, 두 번째 back에서 정상 종료. UX 동일.
- iOS Safari의 edge swipe도 `popstate` 발생으로 동일 처리.

### 6. 카메라 스캐너/모달과의 충돌
- 앱 내 모든 모달(`AlertDialog`, `CameraScanner` 등)은 back 버튼 대신 상태 기반 닫기 버튼을 사용. sentinel pop이 모달을 닫는 사이드이펙트를 만들지 않음.
- 향후 back-닫기 모달을 추가하면 그때 재점검 필요.

### 7. 좋아요 쿨다운, 영수증, 스쿱, 토핑, 관리자/발표자 기능
- 파일 무수정. `useSessionToppings`의 realtime/캐시 흐름과 무관.

## 실제로 조정이 필요한 부분(현재 코드 대비)
1. **가드 effect의 의존성**: 현재 `useEffect(..., [qrFromUrl])`로 묶여 있어 `navigate({ search: {}, replace: true })`로 `qrFromUrl`이 `undefined`가 되는 순간 cleanup이 돌아 `popstate` 리스너가 사라짐 → **첫 back 가드가 무력화되는 것이 지금 사용자가 겪는 증상의 원인**.
   - 대응: 최초 QR 감지 시점에 `hasQrGuardRef.current = true`로 잠그고, effect는 `[]`(마운트 1회)로 두거나, `qrFromUrl || hasQrGuardRef.current`를 조건으로 사용해 URL 정리 후에도 리스너가 유지되도록 변경.
2. **sentinel 삽입 시점**: `setTimeout(..., 0)` 대신 `queueMicrotask`로 `navigate`의 `replaceState` 직후에 확실히 뒤서게 하거나, `navigate` 완료를 `await` 후 push해 순서 보장.
3. **cleanup 시 sentinel 제거 금지**: 컴포넌트 언마운트 시 `history.back()`/`go(-1)` 등을 호출하지 않음(탭 종료 유발). 리스너만 해제.

## 변경 범위
- `src/routes/audience.tsx` 단독. 서버 코드/스키마/다른 화면 무변경.
- 예상 UX: QR로 열린 새 탭에서 첫 뒤로가기는 안내 토스트 + 탭 유지, 2초 내 두 번째 뒤로가기에서만 정상 종료.