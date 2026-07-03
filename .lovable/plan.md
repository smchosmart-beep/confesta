## 원래 계획 요약
QR(`?qr=`)로 새 탭 진입한 경우 히스토리에 센티널 엔트리를 하나 쌓고, 첫 뒤로가기는 토스트로 안내한 뒤 두 번째 뒤로가기에서 탭이 닫히도록 함.

## 검토에서 발견한 리스크와 대응

### 1. 서버 비용
- 100% 브라우저 히스토리 API + `sonner` 토스트만 사용. **서버 함수 호출 0건, DB 요청 0건**. 청구 영향 없음.

### 2. TanStack Router와의 충돌 (실질적 리스크)
현재 코드는 마운트 직후 `navigate({ to: "/audience", search: {}, replace: true })`로 URL을 정리함. 여기에 raw `history.pushState`를 잘못된 순서로 끼우면:
- pushState → navigate(replace) 순서면 센티널이 replace로 덮여 사라짐 → 가드 무력화.
- popstate가 발생하면 라우터도 이를 감지하여 route를 재평가. 같은 URL로 pushState하므로 loader 재실행이 발생할 수 있음(서버 함수는 컴포넌트 useQuery 기반이라 실제로는 무관하지만, 안전하게 처리 필요).

**대응**: 순서를 **replace 먼저 → pushState 나중**으로 고정. popstate 리스너는 라우터를 우회하지 말고 그냥 다시 pushState만 수행(내비게이션 유발 X).

### 3. 앱 내부 네비게이션 후에도 가드가 계속 살아있는 문제 (실질적 리스크)
사용자가 QR 진입 후 앱 안에서 `/admin`, `/presenter` 같은 다른 라우트로 이동하면 히스토리가 `[센티널, /audience, /other]`가 됨. `/other`에서 뒤로가기 → `/audience` 복귀는 정상. 그 다음 뒤로가기 → 센티널 pop → 가드가 발동해 **다른 페이지에서 뒤로가기로 앱을 나가려는 사용자를 붙잡음**. 원치 않는 UX.

**대응**: 리스너를 `/audience` 마운트 스코프에 두고, `location.pathname !== "/audience"` 이면 리스너에서 즉시 return하여 아무것도 하지 않음. 또한 audience 컴포넌트 언마운트 시 리스너 해제 + 남은 센티널 상태는 그대로 두되 무해하게 만듦.

### 4. 카메라 스캐너/모달이 열린 상태에서의 뒤로가기 (실질적 리스크)
현재 앱에는 back으로 닫히는 모달이 없음(모두 상태 기반 close 버튼). 그래도 가드가 첫 back을 삼키므로 사용자가 "back = 모달 닫기"를 기대하면 어긋남 — **현재 구조상 문제 없음**을 확인. 새로 back-닫기 모달을 도입하면 그때 재검토 필요.

### 5. React StrictMode / effect 이중 실행
개발 모드에서 effect가 두 번 돌면 센티널이 2개 쌓여 첫 뒤로가기가 완전히 무반응. **대응**: `useRef<boolean>`로 install 여부 잠금.

### 6. 페이지 새로고침
Chrome은 pushState 히스토리를 새로고침해도 유지함. 새로고침 후에는 `?qr=` 파라미터가 이미 제거된 상태라 가드는 다시 설치되지 않음 → 남은 센티널로 인해 첫 back이 URL 변화 없는 pop을 발생시키고 두 번째 back에 탭 종료. 사용자 관점 UX 동일(오히려 무해). 별도 처리 불필요.

### 7. iOS Safari 스와이프 뒤로가기
popstate로 동일하게 처리됨. 별도 코드 불필요.

### 8. Route.useSearch 타입 정합성
현재도 `qr` 검색 파라미터가 정의되어 사용 중. 스키마 변경 없음.

### 9. 다른 기능 영향 범위
- 좋아요 쿨다운, 영수증, 스쿱, 관리자/발표자 화면: **파일 무수정, 무영향**.
- `/audience` 자체의 QR 처리 로직: 순서만 조정, 로직 동일.

## 최종 구현안 (변경 파일: `src/routes/audience.tsx` 단독)

```
// audience 컴포넌트 내부, 기존 QR 처리 effect에 이어서
const guardInstalled = useRef(false);

useEffect(() => {
  if (!qrFromUrl) return;                     // QR 진입일 때만
  if (guardInstalled.current) return;         // StrictMode 이중실행 방지
  guardInstalled.current = true;

  // navigate({replace:true})가 먼저 실행되도록 microtask 이후 push
  const install = () => {
    window.history.pushState({ confestaBackGuard: true }, "", window.location.href);
  };
  const t = setTimeout(install, 0);

  let lastPromptAt = 0;
  const onPop = () => {
    // audience 페이지가 아니면 관여하지 않음
    if (window.location.pathname !== "/audience") return;
    const now = Date.now();
    if (now - lastPromptAt < 2000) return;    // 2초 내 재-back은 정상 종료 허용
    lastPromptAt = now;
    window.history.pushState({ confestaBackGuard: true }, "", window.location.href);
    toast("한 번 더 뒤로가기를 누르면 앱이 종료돼요");
  };
  window.addEventListener("popstate", onPop);
  return () => {
    clearTimeout(t);
    window.removeEventListener("popstate", onPop);
  };
}, [qrFromUrl]);
```

`toast`는 이미 사용 중인 `sonner`를 재사용. 서버 코드/DB/스키마 무변경. 예상 UX: 실수로 back 눌러도 탭 유지, 필요시 두 번 눌러 정상 종료.
