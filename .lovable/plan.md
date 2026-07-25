## 목표
`/audience` 진입 시 "해당 앱은 직무연수 이수 등과 관련이 없는 질문을 하기 위한 도구일 뿐"이라는 안내 모달을 띄우고, 확인 버튼으로 닫을 수 있게 한다.

## 변경 범위
- `src/routes/audience.tsx`
- `src/hooks/use-disclaimer-shown.ts` (신규)

## 구현 상세

### 1. 신규 훅: `useDisclaimerShown`
- localStorage 키 `confesta:disclaimer-shown` 로 1회 이상 확인했는지 기억.
- SSR/하이드레이션 mismatch 방지를 위해 초기값은 `false`로 두고, `useEffect`에서만 localStorage를 읽어 상태를 갱신.
- `markShown()` 함수로 저장 + 상태를 `true`로 변경.

### 2. `audience.tsx` 적용
- `AudienceView` 내부에 `const { shown, markShown } = useDisclaimerShown()` 추가.
- 역할 선택 게이트(loading/none)보다 먼저 표시할지, 역할 선택 이후에 표시할지 결정:
  - **안내 모달은 역할 선택 게이트보다 먼저 띄운다.** 청중으로 접속하는 즉시 가장 먼저 보이는 UI가 되어야 메시지 전달력이 높음.
  - `roleState === "loading"` 시 `aria-hidden`으로 기존과 동일하게 대기.
  - `roleState === "none"` 이고 `shown === false` 일 때, `AudienceRoleGate` 위에 AlertDialog 오버레이를 표시.
- 기존 `AlertDialog` import 재사용:
  - `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction` 사용.
  - 제목: "안내"
  - 설명: "해당 앱은 직무연수 이수 등과 관련이 없는 질문을 하기위한 도구일 뿐이니 착오없으시기 바랍니다."
  - 버튼: "확인"
- `AlertDialog`의 open 상태를 `!shown`으로 제어. `AlertDialogAction` onClick에서 `markShown()` 호출.

### 3. 스타일
- 기존 `alert-dialog.tsx`의 Cream & Pink 스타일을 그대로 사용. 추가 스타일 조정 불필요.

## 영향 분석
- **기능 영향**: 다른 탭/주문/스쿱/토핑/영수증 로직에 영향 없음.
- **Realtime/DB**: 없음. 클라이언트 localStorage만 사용.
- **성능**: 없음.
- **접근성**: 기존 Radix AlertDialog의 focus trap, ESC 닫기, aria 속성을 그대로 상속.

## 검증 항목
- `/audience` 진입 시 모달 최상단 노출.
- "확인" 클릭 후 모달 닫힘.
- 새로고침 후 모달이 다시 나타나지 않음 (localStorage 기반).
- 모달이 열린 상태에서 뒤쪽 콘텐츠와 상호작용 차단됨.