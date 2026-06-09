
# 발표자 화면 보강 계획

`/presenter`를 단순 QR + 피드 화면에서 **실제 발표 현장에서 쓸 수 있는 컨트롤 센터**로 확장합니다.

---

## 1. 모드 토글 (상단 헤더)

`PresenterModeToggle` 알약 스위치 3개:

- **🎤 핸드헬드 (Handheld)** — 모바일 우선. 발표자 손에 든 화면.
- **📺 무대 (Stage)** — 가로 큰 화면. 청중이 멀리서 보는 디스플레이 (QR 거대화, 워드클라우드 강조).
- **🖼 풀스크린 (Fullscreen)** — `requestFullscreen()` + 키보드 단축키.

선택 모드는 URL 쿼리 `?mode=handheld|stage` 로 저장 (새로고침/공유 가능).

---

## 2. 핸드헬드 모드 레이아웃 (모바일 우선)

세로 스크롤 한 화면, 탭 4개:

1. **컨트롤** — 작은 QR + 다음 슬라이드 미리보기 + 슬라이드 제어 패널 + 타이머
2. **질문** — 청중 질문 목록 전용 뷰 (정렬: 최신/핀/미답변 필터, 카드 탭하면 풀스크린으로 띄움)
3. **워드클라우드** — TOP 토핑 키워드 시각화
4. **출석** — 라이브 출석 카운터 + 진척도 게이지

---

## 3. 무대 모드 레이아웃 (가로 큰 화면)

좌우 2분할 + 하단 띠:

```text
┌─────────────────────────┬──────────────────────────┐
│                         │                          │
│   거대 QR (480px)       │   TOP 토핑 워드클라우드  │
│   "지금 스캔하세요"     │   (사탕색 + bounce-in)   │
│                         │                          │
│   [출석 87 / 120]       │                          │
│                         │                          │
├─────────────────────────┴──────────────────────────┤
│  최근 질문 마퀴 (가로 무한 스크롤, 핀고정 우선)    │
└────────────────────────────────────────────────────┘
```

15초 갱신 프로그레스 바는 QR 아래.

---

## 4. 슬라이드 컨트롤 패널 (`SlideControlPanel`)

목업/시뮬레이션 (실제 슬라이드 연동 X, 로컬 상태):

- 현재 슬라이드 번호 / 총 슬라이드 수 (예: `12 / 30`)
- ◀ 이전 · ▶ 다음 · ⏸ 일시정지 · ⏹ 종료 알약 버튼
- 슬라이드 진척 게이지 (핑크→블루 그라데이션)
- 키보드 단축키: `←/→` 이동, `Space` 다음, `Esc` 풀스크린 해제

zustand 에 `slideIndex`, `slideTotal` 추가, `localStorage` 영속.

---

## 5. 풀스크린 프레젠테이션 모드

- 헤더의 `Fullscreen` 버튼 → `document.documentElement.requestFullscreen()`
- `fullscreenchange` 이벤트 핸들러로 상태 동기화
- 풀스크린 시 자동으로 **무대 모드 + 커서 자동 숨김 (3초 무동작)** 로 전환
- `Esc` 키로 해제

---

## 6. 질문 전용 뷰 (`QuestionStream`)

기존 토핑 피드를 별도 컴포넌트로 분리 + 보강:

- 필터 알약: `전체 / 핀 / 미답변 / 답변완료`
- 정렬: `최신순 / 좋아요순 (mock)`
- 카드 탭 → 모달로 **거대 크기 풀스크린 표시** (무대에서 청중에게 질문 공유용)
- 각 카드에 좋아요 카운트 (mock) 표시

`store.ts` 의 `togglePinTopping`, `toggleAddressedTopping` 재활용.

---

## 7. TOP 토핑 워드클라우드 (`ToppingWordCloud`)

- 토핑 텍스트를 한글 형태소 단순 토크나이저 (공백 + 1글자 이상)로 분해
- 빈도수 기준 TOP 25 키워드 추출
- 빈도수 → 폰트 크기 (24px ~ 88px 스케일), 색상 랜덤 (스쿱 플레이버 5종 순환)
- 화면 중앙 정렬, `flex-wrap` + `bounce-in` 등장 애니메이션
- 5초마다 자동 재계산 (`setInterval`)
- 빈 상태: "토핑이 도착하면 키워드가 모입니다 🍒"

---

## 8. 출석 카운터 게이지 (`AttendanceGauge`)

- mock 정원 (세션 capacity) 대비 실제 스캔된 인원
- 단일 사용자 데모 한계 보완: store 에 `attendanceCount` 추가, 발표자 nonce 갱신 시 또는 청중이 출석할 때마다 카운트 (+ mock 랜덤 증가로 라이브 느낌)
- 둥근 도넛 게이지 (SVG arc) + 가운데 큰 숫자

---

## 9. 파일 변경

**신규**:
- `src/components/confesta/PresenterModeToggle.tsx`
- `src/components/confesta/SlideControlPanel.tsx`
- `src/components/confesta/QuestionStream.tsx`
- `src/components/confesta/QuestionSpotlightModal.tsx`
- `src/components/confesta/ToppingWordCloud.tsx`
- `src/components/confesta/AttendanceGauge.tsx`
- `src/components/confesta/StageMarquee.tsx`
- `src/hooks/use-fullscreen.ts`
- `src/hooks/use-presenter-shortcuts.ts`

**수정**:
- `src/routes/presenter.tsx` — 모드 분기, URL 쿼리 (`validateSearch`), 핸드헬드 탭 / 무대 레이아웃 / 풀스크린 래퍼
- `src/lib/confesta/store.ts` — `slideIndex`, `slideTotal`, `attendanceCount`, `incrementAttendance` 추가
- `src/components/confesta/RoleHeader.tsx` — 우측 슬롯 prop 추가 (모드 토글 자리)

---

## 10. 범위 외

- 실제 슬라이드 파일 업로드 / 렌더링 (목업만)
- 멀티 디바이스 실시간 동기화 (zustand + localStorage 한계 유지)
- 좋아요 실제 집계 (mock 숫자)

승인하시면 구현 시작하겠습니다.
