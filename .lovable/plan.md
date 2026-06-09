## 메인 페이지 타이틀 문구 및 폰트 크기 수정

### 변경 파일
`src/routes/index.tsx`

### 변경 내용
`<h1>` 타이틀 영역을 아래와 같이 수정합니다.

**현재:** `Confesta 콘페스타` (한 줄, 동일 크기)

**변경 후:**
```
AI 디지털 컨퍼런스&페스티벌   ← 작은 폰트
2026 Confesta               ← 큰 폰트 (기존 타이틀 크기 유지)
```

### 상세
- 1행 "AI 디지털 컨퍼런스&페스티벌": `text-base` 또는 `text-lg` 수준으로 축소, 색상은 muted-foreground 또는 회색 계열
- 2행 "2026 Confesta": 기존 `text-5xl sm:text-6xl` 타이틀 크기 유지, 기존 gradient 스타일(노랑→주황) 적용
- `<h1>` 내부를 `flex flex-col`로 배치하여 2줄 구성