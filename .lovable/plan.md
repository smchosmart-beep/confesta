## 목표
관리자 화면 각 세션 슬롯의 발표자 비밀번호 UI에 **"보기" 버튼**을 추가하여, 관리자 PIN 인증을 통과한 사용자가 현재 설정된 비밀번호 원문을 확인할 수 있게 합니다.

## 보안 전제
- 기존 `password_hash`(해시)는 유지 — 발표자 로그인 검증에는 계속 사용.
- 관리자 전용 조회를 위해 `password_plain` 컬럼 추가 저장. **관리자 PIN 인증 서버 함수를 통해서만 반환** 하며, 클라이언트 캐시에 무기한 남지 않도록 열람 시점에만 페치.
- RLS는 기존과 동일하게 anon/authenticated 접근 전면 차단 (`USING (false)`). 조회는 서버 함수 + service role로만 수행.
- 마이그레이션 이전에 저장된 기존 비밀번호는 평문이 없으므로 "—(재설정 필요)" 로 표시.

## 변경 사항

### 1. DB 마이그레이션
- `session_secrets.password_plain TEXT NULL` 컬럼 추가.

### 2. 서버 함수 (`src/lib/confesta/presenter.functions.ts`)
- `setSlotPresenterPassword` 수정: 저장 시 `password_hash`와 함께 `password_plain`도 upsert. 해제(빈 문자열) 시 함께 삭제.
- 신규 `revealSlotPresenterPassword` 추가:
  - `requireAdmin()` 통과 필수.
  - 입력: `{ day, period, room }`
  - 반환: `{ ok: true, password: string | null }` (기존 마이그레이션 전 데이터는 null).

### 3. 관리자 UI (`src/routes/admin.tsx` — `SlotPresenterPasswordInput`)
- "변경/설정" 옆에 **"보기"** 버튼 추가 (설정된 경우에만 노출).
- 클릭 시 서버 함수 호출 → 성공 시 `● 설정됨` 자리에 마스킹 해제된 비밀번호를 인라인 표시 (`font-mono`).
- 표시 상태에서 다시 클릭하거나 5초 후 자동으로 다시 마스킹으로 복귀.
- 평문이 저장되지 않은 레거시 데이터는 "재설정 필요" 안내.

## 파일 목록
- `supabase/migrations/*` — 컬럼 추가
- `src/lib/confesta/presenter.functions.ts` — 저장 로직 확장 + `revealSlotPresenterPassword` 신규
- `src/routes/admin.tsx` — 보기 버튼/토글 UI

## 마이그레이션 진행 순서
1. 마이그레이션 승인 → 실행 후 타입 재생성.
2. 서버 함수 및 UI 코드 수정.
