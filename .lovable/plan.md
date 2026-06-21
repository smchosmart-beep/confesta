## 관리자 차 차양막 패턴 수정

운영 스태프 차(민트) 차양막 = 흰색/색상 균일 교대 줄무늬. 관리자 차(주황)는 줄무늬 폭이 불균일하고 패턴이 깨져 있음.

### 작업
- `imagegen--edit_image`로 `src/assets/truck-mango.png` 재생성: 차양막만 운영 스태프 차와 동일한 균일 흰색–주황 교대 줄무늬로 교체. 차체, 창문, 바퀴, 문, 아이스크림콘 등 나머지 모든 요소는 그대로 유지.
- 결과를 `lovable-assets create`로 업로드 후 `src/assets/truck-mango.png.asset.json` 갱신.
