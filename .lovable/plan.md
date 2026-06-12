# 초기화 액션에 인앱 모달 + PIN 재확인 추가

현재 `SlotResetButton`은 브라우저 기본 `window.confirm()`을 사용하고, 관리자 인증은 `AdminAuthGate`에서 한 번만 확인합니다. 실수로 초기화되는 것을 막기 위해, 초기화 시점에 앱 내 모달을 띄우고 관리자 PIN을 다시 입력해야 실행되도록 변경합니다.

## 변경 사항

### 1. `src/routes/admin.tsx` — `SlotResetButton` 리팩터링
- `window.confirm` 제거.
- 버튼 클릭 시 `Dialog`(shadcn) 모달을 연다.
- 모달 구성:
  - 제목: `"{label} 초기화"` (예: `"402 B 초기화"`)
  - 설명: `"이 공간의 모든 주문 / 수령 / 토핑이 삭제됩니다. 되돌릴 수 없습니다."`
  - 입력: `type="password"`, `inputMode="numeric"`, placeholder `"관리자 PIN"`, autoFocus
  - 잘못된 PIN이면 빨간 헬퍼 텍스트 + shake 애니메이션 (`AdminAuthGate`와 동일한 패턴)
  - 버튼: `취소` / `초기화` (PIN 비어있으면 disabled, 진행 중이면 spinner+disabled)
- 제출 흐름:
  1. `verifyPin({ role: "admin", pin })` 호출
  2. `ok === false` → 에러 표시, 입력란 비우고 재포커스, 모달 유지
  3. `ok === true` → 이어서 `resetSlotData({ day, period, room })` 호출 → 성공 시 toast + 쿼리 invalidate + 모달 닫기
- 모달이 닫힐 때 PIN 입력값과 에러 상태 초기화.

### 2. 서버 측 보강 (선택적, 권장)
`src/lib/confesta/admin.functions.ts`의 `resetSlotData` 입력 스키마에 `pin: z.string().min(1).max(32)`을 추가하고, 핸들러 진입 시 `verifyPinValue("admin", data.pin)`로 한 번 더 검증한다. 이렇게 하면 쿠키가 탈취된 상황에서도 초기화에는 별도 PIN이 필요하다.
- `verifyPinValue`는 `src/lib/confesta/pin.server.ts`에 이미 존재하므로 동적 import만 추가.
- 클라이언트 호출부도 `pin`을 함께 보내도록 수정.

## 영향 범위
- 영향 파일: `src/routes/admin.tsx`, `src/lib/confesta/admin.functions.ts`
- 기존 `AdminAuthGate`, `verifyPin` 서버 함수, 다른 서버 함수 동작은 변경되지 않음.
- UI 톤은 기존 `AdminAuthGate`(빨간 헬퍼/shake, 둥근 입력) 스타일을 그대로 따라 일관성 유지.

## 확인 사항
- 서버 측에서도 PIN을 재확인할까요? (권장) 아니면 클라이언트에서 `verifyPin`만 확인하고 `resetSlotData`는 기존대로 둘까요?
