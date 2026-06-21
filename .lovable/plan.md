## 3대 트럭 이미지의 흰 배경 제거

이미지 편집 과정에서 PNG 투명도가 사라져 발표자/스태프/관리자 차에 흰 정사각형 배경이 생김. 청중차는 원본 투명 그대로라 정상.

### 작업
- Python(Pillow + rembg) 또는 ImageMagick으로 `/tmp/fix-blueberry.png`, `/tmp/fix-mint.png`, `/tmp/fix-mango.png` 3장의 흰 배경을 투명으로 변환.
- `lovable-assets create`로 재업로드하여 3개의 `.asset.json` 갱신.
- 청중차는 손대지 않음.
