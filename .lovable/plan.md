## 결론
적용해도 서버비 0, DB 무변경, 다른 기능 무영향. 다만 "확인 시 종료" 동작에는 브라우저 제약이 있어 UX 문구를 그에 맞게 조정해야 함.

## 서버비/DB
- 추가되는 것은 React state 하나 + Radix AlertDialog 렌더뿐. `createServerFn`/Supabase/realtime 호출 없음.
- 기존 `placeOrder`/`pickup` 흐름 무변경. **청구 영향 0**.

## 다른 기능 회귀 검토
- 가드는 `/audience`에서만, `?qr=` 있을 때만 활성. `/admin`/`/presenter`/`/staff`/`/` 무영향.
- 기존 모달(`CameraScanner`, `SlotToppingsModal`, `QuestionSpotlightModal` 등)은 모두 state 기반 open/close. AlertDialog는 서로 다른 Radix 인스턴스라 z-index/포커스 트랩 충돌 없음(동시에 열릴 시나리오도 없음 — popstate는 사용자가 back 버튼을 눌러야만 발생).
- realtime 채널/캐시(`use-toppings`, `use-audience` 등) 무변경.
- StrictMode 이중 마운트: `guardListenerInstalledRef`로 sentinel 중복 방지(기존 유지).

## 실제 동작상의 리스크와 대응

### 1. `window.close()`는 대부분의 브라우저에서 동작하지 않음
- 스펙상 `window.close()`는 **스크립트로 열린 창**(`window.open`)만 닫을 수 있음. QR 스캐너 앱이 브라우저를 launch한 탭은 "스크립트가 연 창"이 아니므로 `window.close()`는 조용히 무시됨.
- `history.go(-2)`는 sentinel 2개를 한 번에 pop해서 원래의 진입 이전(빈 히스토리)으로 가 결국 탭 종료와 유사한 결과를 만들 수 있으나, sentinel 개수가 상황에 따라 1개일 수도 있어 -2가 항상 옳지 않음.

### 2. "확인=진짜 종료"는 보장 불가
- 브라우저 UX상 사용자가 명시적으로 탭을 닫는 것 외에 앱이 확실히 탭을 닫는 방법은 없음.
- 따라서 "확인" 버튼의 실제 의미는 **"가드를 해제하고 다음 뒤로가기를 통과시킴"**으로 재정의해야 함.

### 대응 (계획 수정)
- "확인" 클릭 시:
  1. `guardReleasedRef.current = true`로 표식.
  2. AlertDialog 닫음.
  3. `window.history.back()` 호출.
  4. `popstate` 핸들러는 `guardReleasedRef.current === true`면 아무 것도 하지 않고 return → 브라우저가 실제 뒤로가기 수행 → 히스토리가 비면 탭 종료.
- "계속 보기" 클릭 시: `pushSentinel()` 한 번 더 실행 후 다이얼로그만 닫음(이미 popstate 핸들러에서 push했으므로 사실상 no-op이지만 안전 보강).

## iOS Safari / 인앱 브라우저 한계 (사용자 고지)
- iOS Safari 엣지 스와이프: `popstate` 없이 이전 탭으로 이동할 수 있음 — 앱 레벨 제어 불가.
- 카카오톡/인스타 등 인앱 브라우저 내 자체 "닫기" 버튼: 가드 우회. QR 앱이 자체 브라우저로 열면 back 대신 X 버튼이 별도 존재.
- 이 두 케이스는 어떤 방식으로도 막을 수 없음(브라우저 레벨).

## 변경 범위
- `src/routes/audience.tsx` 단독.
- `import { toast } from "sonner"` 제거(가드 안내용도 삭제 시), `import { AlertDialog, AlertDialogContent, ... } from "@/components/ui/alert-dialog"` 추가.
- `useState<boolean>` `showExitDialog` + `useRef<boolean>` `guardReleasedRef` 추가.
- 파일 하단에 `<AlertDialog>` 렌더.

## 기술 세부
```tsx
const [showExitDialog, setShowExitDialog] = useState(false);
const guardReleasedRef = useRef(false);

const onPop = () => {
  if (guardReleasedRef.current) return;         // 사용자가 종료 확인함 → 통과
  if (window.location.pathname !== "/audience") return;
  pushSentinel();                                // 히스토리 유지
  setShowExitDialog(true);
};

// 확인 버튼
onClick={() => {
  guardReleasedRef.current = true;
  setShowExitDialog(false);
  window.history.back();   // sentinel pop → 통과 → 히스토리 소진 시 탭 종료
}}
```

## 최종 판단
계획의 방향(모달 확인)은 UX 상 토스트보다 명확해 타당함. 단, "확인=반드시 탭 종료"는 브라우저 제약으로 보장 불가하므로 위 세부처럼 "가드 해제 후 back 통과" 방식으로 구현하고, 버튼 라벨을 "종료" 대신 **"뒤로 가기"**로 두는 편이 실제 동작과 일치.
