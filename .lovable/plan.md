## 옵션 B 진행
기존 마스크 PNG에서 **스커트(녹는 부분)만 잘라낸 새 마스크** 생성 → 본체 자연스러운 곡선은 유지, 아래 찌글찌글한 부분 제거.

## 작업
1. **새 마스크 생성** (`/tmp/scoop-mask-dome.png`)
   - 원본 `/mnt/user-uploads/스쿱.png` 알파 채널 로드
   - 각 컬럼에서 SVG U자 곡선 라인 `y = 55 + 27·(1 − 4(x−0.5)²)` (0~100 normalized) 아래 픽셀을 모두 알파 0으로 마스킹
   - 곡선 경계는 0.8px 가우시안 블러로 부드럽게
   - 흰색 실루엣 + 투명 배경 PNG로 저장

2. **CDN 업로드**
   - `lovable-assets create --file /tmp/scoop-mask-dome.png --filename scoop-mask.png > src/assets/scoop-mask.png.asset.json` (덮어쓰기)
   - 기존 에셋은 `assets--delete_asset`으로 정리

3. **ScoopCard.tsx 정리**
   - 마스크는 자동으로 새 URL 사용 (import 그대로)
   - **SVG U자 곡선 path 제거** — 마스크가 이미 그 모양으로 잘려있으니 경계선 불필요
   - 컨텐츠 padding 조정: `paddingBottom: "32%"` → `"18%"` (스커트 사라졌으니 텍스트가 본체 안에 자연스럽게 자리)
   - 스커트 음영용 `linear-gradient`도 제거(또는 약하게)

## 결과
- 본체는 약간 비대칭의 organic한 돔 형태 유지
- 아래 찌글찌글한 부분 없이 곡선 바닥
- 입체 셰이딩(반구 볼륨, 스페큘러, 엣지 비네팅, drop-shadow)은 그대로
