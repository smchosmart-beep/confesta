# QR 인쇄 시 페이로드/버튼 제외하고 QR만 인쇄

## 문제
현재 `SlotQRModal`의 인쇄 버튼은 `window.print()`로 페이지 전체를 인쇄합니다. 그 결과:
- 관리자 대시보드(목록, 게이지 등) 전체가 같이 인쇄됨 (3페이지)
- 인쇄된 QR 종이에 `confesta:order:...` 페이로드 문자열, 인쇄·재발급 버튼이 남음

## 해결 방법
인쇄 전용 새 창을 열어 QR + 제목/부제만 담은 자체완결 HTML을 인쇄합니다. 메인 페이지의 print CSS를 전혀 건드리지 않아 사이드이펙트 없음.

### 변경 파일: `src/components/confesta/SlotQRModal.tsx`
- 모달의 QR 컨테이너에 `ref` 추가 → 인쇄 시 `react-qr-code`가 렌더한 `<svg>`를 `XMLSerializer`로 직렬화
- 새 `handlePrint()`:
  1. `window.open("", "_blank", "width=480,height=640")`
  2. 새 창에 작성: `<title>제목 · 주문 QR</title>`, "주문 QR" 라벨, 슬롯 제목, 부제(`Day · 시간 · 호실`), 그리고 QR SVG만
  3. `@page { size: A4; margin: 18mm }`, 중앙정렬, 흑백
  4. **payload 문자열, 인쇄/재발급 버튼은 포함하지 않음**
  5. `load` 후 `print()`, `afterprint`에 `close()`
  6. 팝업 차단 시 alert로 안내
- 인쇄 버튼 `onClick`을 `handlePrint`로 교체
- 더 이상 필요 없는 `print:` Tailwind 클래스 모두 제거 (화면 표시 전용 모달)
- 화면 상의 payload 표시는 그대로 유지(관리자 디버깅용) — 인쇄물에만 빠짐

## 결과
- 인쇄 미리보기: A4 1장, QR과 슬롯명/시간만. payload 문자열·버튼 없음.
- 관리자 페이지 본문은 인쇄되지 않음.
