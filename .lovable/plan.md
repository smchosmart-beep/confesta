## 변경
잘라낸 새 돔 마스크의 **실제 바닥 곡선 바로 안쪽**에 어두운 그림자 곡선을 다시 추가해, 돔 바닥 가장자리가 입체적으로 살짝 음영지도록.

## 마스크 곡선 좌표
마스크 컷 라인: `y = 55 + 27·(1 − 4(x−0.5)²)` (0~100, viewBox 좌표)
→ 양 끝 (x=0,100): y=55, 가운데 (x=50): y=82

## 파일
- `src/components/confesta/ScoopCard.tsx`

## 수정
`{/* topping decor */}` 위, edge vignette 아래에 SVG 그림자 곡선 1개 추가:

```jsx
<svg
  className="absolute inset-0 w-full h-full pointer-events-none"
  viewBox="0 0 100 100"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  {/* 돔 바닥 안쪽 그림자 — 마스크 컷 라인 바로 안쪽에 위치 */}
  <path
    d="M 3,52 Q 50,79 97,52"
    stroke="rgba(0,0,0,0.30)"
    strokeWidth="4"
    fill="none"
    strokeLinecap="round"
    style={{ filter: "blur(2.5px)" }}
  />
</svg>
```

- 컷 라인(55→82)보다 3px 위쪽 (52→79)에 배치 → 그림자가 돔 안쪽에 머무름
- blur 2.5px로 부드러운 ambient occlusion 느낌
- 흰색 림은 깔끔함 우선이므로 생략

## 결과
돔 아래쪽 가장자리가 살짝 어두워져 반구가 바닥에 얹혀 있는 듯한 입체감 회복.
