## 목표
UI 모든 표시에서 `"402-A"` → `"402"`로 렌더. 내부 데이터/서버 인자/DB/QR 페이로드/쿠키 키는 `"402-A"` 그대로 유지 → 기존 QR·비밀번호·토핑·북마크·집계 무손실.

## 공통 헬퍼
`src/lib/confesta/shared.ts`에 추가:
```ts
export const displayRoom = (room: string) => (room === "402-A" ? "402" : room);
```
(이 한 함수로 모든 표시 지점 통일. 유지보수 단일 지점 확보.)

## 데이터 정의
`src/lib/confesta/mockData.ts`
- `VENUES` 402: `subspaces: ["A","B"]` → `["A"]` (UI 목록에서 402-B 숨김)
- `SESSIONS` s4는 이미 `room: "402-A"` → 변경 없음(내부값)

## 표시 지점 일괄 치환 (`displayRoom` 적용)
아래 모든 렌더 위치에서 `room`을 출력할 때 `displayRoom(room)` 통과:

1. `src/routes/admin.tsx`
   - VenueCard/MobileVenueCard의 sub 라벨, 헤더, 툴팁
   - QR 모달로 넘기는 `title` prop
   - SlotTitleInput 등에 room을 그대로 노출하는 자리
2. `src/routes/presenter.tsx`
   - 장소 Select `<SelectItem>` 표시(라인 320~321) — value는 `s.room` 유지, 라벨만 치환
   - 세션 Select 표시(라인 350~352)
   - `SlotUnlockCard`에 `room={slot.room}` 넘길 때 별도 `roomLabel` prop 추가 or 컴포넌트 내부에서 `displayRoom` 사용
   - `SlotQRModal` subtitle(라인 635) `${slot.room}` → `${displayRoom(slot.room)}`
3. `src/routes/audience.tsx`
   - 라벨 문자열(라인 154~167 `${title || s.room}`, `${slot.room} · …`) → `displayRoom` 적용
   - 스캐너/북마크/오더 카드에 room 표시하는 부분 포함
4. `src/components/confesta/SessionCard.tsx` (라인 37) `{session.room}` → `{displayRoom(session.room)}`
5. `src/components/confesta/SlotUnlockCard.tsx`
   - 카드 헤더의 `{room}` 표시 → `displayRoom(room)` 
6. `src/components/confesta/SlotQRModal.tsx`
   - 무변경(전달받은 title/subtitle을 그대로 렌더). 호출부에서 이미 치환된 값 전달.
7. 기타 room을 텍스트로 렌더하는 모든 지점(OrderCard, ReceiptCard, ToppingTubScene, StageMarquee 등) — 검색 후 발견되는 곳 모두 `displayRoom` 적용
   - 검색 기준: `\.room` / `slot.room` / `session.room` / `s.room`을 JSX/템플릿에서 렌더링하는 위치

## admin 그리드 크기 (402 단일 큰 타일)
`src/routes/admin.tsx` `subGridStyle("402")`:
- `gridTemplateAreas: '"b" "a"'` → `'"a"'`
- 높이는 기존 A+B 2행 합산 유지: `gridTemplateRows: "minmax(calc(208px * 2 + var(--gap, 0px)), auto)"` (좌측 컬럼 세로 총합/hall `pt-[404px]` 정렬 유지)

## 서버/DB/과금 영향
- 0. 서버함수 인자·쿼리 캐시 키·QR 페이로드·쿠키 이름 모두 `"402-A"` 유지.
- RLS/트래픽/스토리지 변화 없음.

## 부작용
- **완전 무손실**: 기존 402-A의 QR/PW/토핑/북마크/집계 그대로 사용됨.
- **402-B 잔존 DB row**: UI 노출·집계에서 제외될 뿐 삭제되지 않음. 복구 시 `subspaces`에 "B" 재추가.
- **그리드 정렬**: 402 타일 높이를 A+B 합산값으로 명시하면 hall 컬럼 `pt-[404px]`와 정렬 유지.
- **인쇄된 QR 종이(있다면)**: 페이로드 자체는 402-A 그대로여서 스캔 동작 이상 없음. 종이에 "402-A"로 인쇄돼 있어도 이후 재인쇄 시엔 "402"로 출력.

## 확인/검증(구현 후)
- admin: 402 타일이 A+B 합친 높이의 단일 타일, 라벨 "402"
- presenter: 장소 Select에 "402"만, 선택 후 QR 발급/재발급/오더 정상
- audience: 스캔·북마크 표시 모두 "402"
- 기존 402-A 슬롯 비밀번호로 잠금 해제 정상
