## 변경
돔 마스크를 SVG 경계선 곡선과 정확히 일치하도록 다시 잘라, 경계선 아래로 마스크가 삐져나오지 않게 한다. 경계선 SVG path는 건드리지 않음.

## 새 컷 곡선
현재 SVG path: `M 3,52 Q 50,79 97,52` (viewBox 0-100)
→ 마스크 컷 정규식: `y_norm = 0.52 + 0.27·(1 − 4(x−0.5)²)`
  - 양 끝(x=0,1): y=0.52
  - 가운데(x=0.5): y=0.79
(기존 0.55 / 0.82에서 0.03 위로)

## 작업
1. Python 스크립트로 `/tmp/scoop-mask-dome.png` 재생성 — 위 새 곡선으로 컷
2. `lovable-assets create` 로 같은 파일명 업로드, `src/assets/scoop-mask.png.asset.json` 덮어쓰기
3. ScoopCard.tsx 변경 없음 (SVG path, padding 그대로)
