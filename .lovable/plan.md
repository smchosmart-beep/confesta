## 발표자 화면 헤더 3열 분리

### 목표
발표자 화면 헤더를 3열로 분리:
1. **1열**: 발표자 (Presenter)  
2. **2열**: 세션명 (예: 개막식 · 비전특강 — AI 시대...)  
3. **3열**: 장소 (예: LEWEST Hall A)

### 변경 내용
1. **src/components/confesta/RoleHeader.tsx**  
   - `description` prop 타입을 `string` → `React.ReactNode`로 확장  
   - `subtitle?: React.ReactNode` prop 추가 → 있으면 `description` 아래에 별도 `<p>` 또는 `<div>`로 렌더링  
   - 기존 호출 지점과 하위 스타일 유지

2. **src/routes/presenter.tsx**  
   - `<RoleHeader>` 호출 시 `description={selected?.title}` / `subtitle={selected?.room}`로 분리 전달  
   - 세션 미선택 시 기존 "세션을 선택해 주세요"는 `description`에 유지  

### 영향 범위
- 다른 `RoleHeader` 호출처(`audience.tsx`, `staff.tsx`, `admin.tsx`)는 `subtitle` 미지정으로 기존 동작 그대로 유지  
- `presenter.tsx`의 `SlotPickerBar` 및 하위 콘텐츠 영역에는 영향 없음