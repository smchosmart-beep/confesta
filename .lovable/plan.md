## 목표

발표자 페이지에서 세션을 고르려면 해당 세션의 비밀번호를 입력하도록 한다. 비밀번호 통과 전에는 세션 콘텐츠가 전혀 보이지 않으며, 통과 상태는 저장하지 않아 매번 입력해야 한다.

## 데이터

`mockData.ts`의 각 `Session`에 `presenterPassword: string` 추가. 데모용 시드값(예: `math01`, `edu02`, …) — 발표자 명함이나 사전 안내로 공유한다고 가정.

`Session` 타입에 `presenterPassword: string` 필드 추가.

## 인증 상태

- React `useState`로 `unlockedSessionId: string | null` 보관 (라우트 로컬). 새로고침/탭 종료 시 사라짐.
- 저장소(zustand persist) 사용 안 함 → "매번 입력" 요구 충족.

## UX 흐름

발표자 페이지 진입 시:

1. **세션 선택 화면** — Day / 오전·오후 / 세션 셀렉트를 보여주되, 발표자 콘텐츠(슬라이드 패널, 토핑 키워드, 게이트 컨트롤, 질문 목록, 수령 QR 버튼)는 전부 가림.
2. 세션을 고르면 그 자리에 **잠금 카드**가 뜸:
   - 자물쇠 아이콘 + "<세션 제목> 발표자 인증"
   - 비밀번호 input (type=password) + "잠금 해제" 버튼
   - 틀리면 흔들림 + "비밀번호가 맞지 않아요" 안내
   - "다른 세션 선택" 링크로 셀렉트로 돌아갈 수 있음
3. 통과하면 기존 발표자 콘텐츠가 전부 노출.
4. 세션 셀렉트에서 다른 세션으로 바꾸면 즉시 잠금 상태로 되돌아감(`unlockedSessionId`를 새 sessionId와 비교).

데모 편의: 잠금 카드 하단에 "데모 비밀번호: `xxxx`" 작은 글씨로 표시(운영에서는 제거 가능하도록 주석 표시).

## 작업 항목

1. `src/lib/confesta/types.ts` — `Session`에 `presenterPassword: string` 추가
2. `src/lib/confesta/mockData.ts` — 각 세션에 고정 비밀번호 시드값 부여
3. `src/components/confesta/PresenterAuthGate.tsx` (신규) — 세션 정보 + onUnlock 콜백 받는 잠금 카드. 흔들림 애니메이션, 데모 힌트 포함.
4. `src/routes/presenter.tsx` — `unlockedSessionId` 상태 추가. 세션 셀렉터는 항상 표시. `sessionId !== unlockedSessionId`이면 본문 대신 `PresenterAuthGate` 렌더, 통과 시 `setUnlockedSessionId(sessionId)`.

## 변경하지 않는 것

- 청중 / 스태프 / 관리자 뷰
- 토핑 게이트 로직, 스토어 데이터 구조
- 세션 셀렉터 UI 자체 (그대로 위에 노출)

## 부수 수정

`OrderCard`의 시간 표시가 SSR/CSR 간 타임존 차이로 hydration mismatch를 일으키는 중 — 해당 `<p>`에 `suppressHydrationWarning`을 추가해 함께 정리한다(작업 항목과 무관한 정리).
