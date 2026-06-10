# 스쿱 카드: 알파 PNG 마스크로 전환 (깨끗한 흑백 실루엣)

## 1) 마스크 PNG 가공
- 입력: `/mnt/user-uploads/스쿱.png`
- Python(PIL)로 처리:
  1. RGBA로 열어 알파 채널 추출
  2. 알파 < 30 → 0, 알파 ≥ 30 → 255 로 임계 처리 (안티앨리어싱 가장자리는 살짝 유지하기 위해 가우시안 블러 0.7px 후 임계 적용)
  3. RGB는 전부 흰색(255,255,255), 알파만 위 값으로 → **흰색 실루엣 + 투명 배경 PNG**
  4. 정사각형으로 트리밍/패딩하여 컨테이너 비율과 일치
- 출력: `/tmp/scoop-mask.png`
- CDN 업로드:
  ```
  lovable-assets create --file /tmp/scoop-mask.png --filename scoop-mask.png \
    > src/assets/scoop-mask.png.asset.json
  ```

## 2) `ScoopCard.tsx` 리팩토링
- 기존 SVG `<clipPath>` 정의 / `SCOOP_PATH` 상수 / `CLIP_ID_COUNTER` 전부 제거
- 마스크 에셋 import:
  ```ts
  import scoopMask from "@/assets/scoop-mask.png.asset.json";
  ```
- 카드 컨테이너:
  ```tsx
  <div
    className="relative aspect-square w-full"
    style={{
      WebkitMaskImage: `url(${scoopMask.url})`,
      maskImage: `url(${scoopMask.url})`,
      WebkitMaskSize: "contain",
      maskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
    }}
  >
    {/* 기존 그라데이션 + 하이라이트 + 토핑 + 콘텐츠 */}
  </div>
  ```
- 부모 `<Link>`에 동일 PNG로 그림자 부여:
  ```ts
  filter: `drop-shadow(0 14px 26px ${shadowColor})`
  ```
  (드롭섀도는 마스크된 실루엣 그대로 적용되므로 별도 처리 필요 없음 — 기존 `FLAVOR_SHADOW`를 유지하되 마스크된 자식의 alpha를 따라가도록 부모에 그대로 둠.)
- 텍스트/아이콘 padding: 본체 원형 영역(상단 ~75%)에 위치하도록 `pt-5 pb-[26%] px-10`로 조정
- `max-w-[340px] mx-auto`, `aspect-square` 유지

## 3) `design.md` 8.5 ScoopCard 갱신
- "구현" 항목 다시 작성:
  - 알파 채널 PNG(`src/assets/scoop-mask.png.asset.json`)를 CSS `mask-image`로 적용
  - 마스크는 흰색 실루엣 + 투명 배경 → 컨테이너 내부의 그라데이션/토핑/콘텐츠를 스쿱 모양으로 잘라냄
  - 동일 실루엣 그림자는 부모 `<Link>`에 `filter: drop-shadow(...)`로 부여
  - 마스크 PNG 교체만으로 카드 실루엣을 변경할 수 있음

## 변경 파일
- 신규: `src/assets/scoop-mask.png.asset.json`
- 수정: `src/components/confesta/ScoopCard.tsx`, `design.md`

## 변경하지 않음
- 색/그라데이션 토큰, ToppingScatter, 다른 카드 컴포넌트, 라우트 코드
