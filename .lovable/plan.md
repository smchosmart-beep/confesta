요청: 관리자 화면의 토핑확인 모달(`SlotToppingsModal`) 가로 길이를 현재의 2배로 확장.

현재 상태
- 파일: `src/components/confesta/SlotToppingsModal.tsx` 73행
- `DialogContent`에 `max-w-3xl`(Tailwind 기준 768px)이 적용되어 있음.

변경 내용
- `max-w-3xl` → `max-w-screen-2xl`(1536px)로 교체하여 현재 너비의 정확히 2배(768px × 2 = 1536px)로 확장.

이외 로직·레이아웃 변경 없음.