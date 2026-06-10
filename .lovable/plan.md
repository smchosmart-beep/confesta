# Admin PIN 잠금 해제 실패 수정

## 증상
- Admin PIN을 정확히 입력해도 에러는 안 뜨지만 잠금 화면이 그대로 남아 있음.
- 네트워크 로그: `verifyPin` 은 `ok: true` 를 돌려주는데, 직후의 `checkPin` 이 `ok: false` 를 반환.

## 원인
Lovable 프리뷰는 `lovable.dev` 안에 `lovableproject.com` iframe 으로 임베드돼 있어서, 앱이 내려보내는 쿠키가 브라우저 입장에서는 **third-party 쿠키**다. 지금 `src/lib/confesta/auth.functions.ts` 에서 쿠키를 다음과 같이 굽고 있다:

```ts
setCookie(cookieName(data.role), makeCookieValue(data.role), {
  httpOnly: true,
  secure: true,
  sameSite: "lax",   // ← iframe 3rd-party 컨텍스트에서 막힘
  path: "/",
  maxAge: COOKIE_MAX_AGE,
});
```

`SameSite=Lax` 는 third-party iframe 의 fetch 응답에 대해서는 쿠키를 저장하지 않거나 다음 요청에 실어주지 않는다. 그래서 `checkPin` 에는 쿠키가 도달하지 않고, 매번 게이트가 다시 뜬다.

## 수정 내용
`src/lib/confesta/auth.functions.ts` 의 3개 serverFn (`verifyPin`, `clearPin`, 필요 시 `checkPin` 갱신) 에서 쿠키 옵션을 iframe 안전 조합으로 바꾼다:

- `sameSite: "none"`
- `secure: true` (이미 설정됨)
- `partitioned: true` (CHIPS — Chrome 의 partitioned cookie 지원; iframe-별로 격리된 third-party 쿠키 저장 허용)

`deleteCookie` 도 동일 옵션으로 호출해야 브라우저가 같은 쿠키 키로 인식해서 지운다.

세 PIN 역할(presenter / staff / admin)이 모두 동일한 쿠키 헬퍼를 쓰므로, 한 곳만 고치면 presenter / staff 측 잠금 화면도 같이 정상화된다.

## 영향 범위 / 변경 파일
- 편집: `src/lib/confesta/auth.functions.ts` (쿠키 옵션 3곳)

게이트 UI(`AdminAuthGate.tsx`), `pin.server.ts` 의 서명/검증 로직, DB 스키마는 손대지 않는다.

## 검증
1. 프리뷰 iframe 에서 `/admin` 접속 → PIN 입력 → 잠금 해제 후 그리드 노출 확인.
2. 새로고침 후에도 잠금 해제 상태 유지(쿠키 12h TTL).
3. 같은 수정으로 presenter / staff 잠금 화면도 한 번 시도해 정상 동작 확인.
4. 게시(production) 도메인에서도 동일하게 동작해야 함 — `SameSite=None; Secure; Partitioned` 는 first-party 컨텍스트에서도 안전하게 동작.
