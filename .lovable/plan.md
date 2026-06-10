# 홈 카드 → 스쿱(돔) 모양 카드

## 모양 컨셉
첨부된 스쿱 이미지처럼:
- 카드 윗부분은 **큰 반원 돔** (둥글게 솟은 형태)
- 카드 아랫부분은 살짝 흘러내린 듯한 **불규칙한 물결(scalloped) 모서리**
- 와플콘 없음

```text
   _.-~~~~~~~~~-._        ← 위: 매끈한 돔(반원)
  /               \
 |                 |
 |   icon + text   |
  \_/\__/\_/\__/\_/       ← 아래: 부드러운 물결 모서리
```

## 구현 방식
CSS만으로는 한쪽만 둥근 돔+물결을 안정적으로 만들기 어려우니 **SVG `clipPath`로 카드 전체를 마스킹**한다.

1. **신규 파일 `src/components/confesta/ScoopCard.tsx`**
   - 루트: `<Link>` 기반, `relative` 컨테이너. `aspect-[4/3]` 정도로 카드 비율 고정.
   - 내부 구조:
     - 배경 div: `bg-grad-{flavor}` + `bg-grad-{flavor}-soft` 오버레이, `style={{ clipPath: 'url(#scoop-clip)' }}` 적용.
     - 콘텐츠 div: 아이콘(좌상단 원형 배지) + 라벨/한글명/설명. 클립 안쪽에 padding 충분히.
     - 토핑 점 데코(`ToppingScatter`)를 클립 내부에 살짝.
   - 컴포넌트 최상단에 한 번 `<svg width="0" height="0">` 안에 `<clipPath id="scoop-clip" clipPathUnits="objectBoundingBox">` 정의. path는:
     - 상단: 0,0.45에서 시작해 큐빅 베지어로 0.5,0 정점을 거쳐 1,0.45까지 매끈한 반원 돔
     - 양옆 직선 짧게 내려옴 (0,0.45 → 0,0.7 / 1,0.45 → 1,0.7)
     - 하단: 물결(여러 개의 작은 Q 곡선 반복)로 0,0.7 → 1,0.7 닫음
   - 그림자/외곽선: clipPath는 box-shadow를 잘라먹으므로 같은 path를 `<svg>`로 한 번 더 그려 `filter: drop-shadow(...)`로 부드러운 그림자 부여(`shadow-pink`/`shadow-blue` 톤을 hex로 인라인).

2. **`src/routes/index.tsx`**
   - ROLES 배열 유지.
   - 카드 렌더링을 `<ScoopCard flavor={...} icon={...} label ko desc to />`로 교체.
   - 그리드 `grid-cols-1 md:grid-cols-2 gap-6` 유지. 카드 높이는 컴포넌트 내부에서 보장.

3. **`design.md`**
   - `8.5 스쿱 카드 (ScoopCard)` 섹션 추가:
     - 형태: 윗면은 매끈한 반원 돔, 아랫면은 물결(scalloped) 모서리 — Baskin Robbins 스쿱 옆모습.
     - 구현: SVG `clipPath`(`objectBoundingBox`)로 카드 컨테이너 마스킹, 동일 path로 `drop-shadow` 부여.
     - 채움: `bg-grad-{flavor}` + `*-soft` 오버레이.
     - 사용처: 홈 역할 선택 카드, 향후 카테고리 선택 카드에도 재사용.
   - `9. 아이콘그래피` 위 정도에 한 줄: 스쿱 카드 내 아이콘 배지는 `w-12 h-12 rounded-full bg-white/70 ring-2 ring-white`.

## 변경 파일
- 신규: `src/components/confesta/ScoopCard.tsx`
- 수정: `src/routes/index.tsx`, `design.md`

## 변경하지 않는 것
- 다른 카드(`SessionCard`, 데모 안내 박스 등), 색 토큰, 그라데이션 유틸은 그대로.
