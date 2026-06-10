## 문제
3스쿱 미만일 때 보이는 SAMPLE 미리보기 영수증에는 `이미지로 저장` 버튼이 없음. 실제 영수증(3스쿱 이상)에는 버튼이 있음.

## 해결
`!ready` 분기(샘플 영수증 렌더링 구간) 아래에도 `html-to-image` `toPng`로 캡처할 수 있는 저장 버튼을 추가.

### 구현 상세

- `src/components/confesta/ReceiptCard.tsx`:
  - `sampleRef = useRef<HTMLDivElement>(null)` 추가.
  - `!ready` 블록 내 `<SampleReceipt ...>`을 `<div ref={sampleRef}>`로 감싸기.
  - `handleSaveSampleImage` 핸들러 추가: `sampleRef.current`를 `toPng`로 PNG 생성 후 다운로드 트리거. 파일명에 `sample` 접두사 추가.
  - 실제 영수증 저장 버튼(`handleSaveImage`)과 동일한 스타일의 버튼을 샘플 영수증 하단에 배치.

### 영향 없음
- 실제 영수증(3스쿱 이상)의 저장 로직, 스타일, 토큰 발급 로직은 변경 없음.
- `SampleReceipt` 컴포넌트의 props, 내부 렌더링은 변경 없음. 단순히 감싸는 container만 추가.
