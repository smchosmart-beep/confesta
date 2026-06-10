## 진단
사용자가 빨간 펜으로 그린 곡선 = **양 끝 위, 가운데 아래로 푹 꺼진 U자(스마일)** 곡선.
지금 직선처럼 보이는 진짜 원인은 두 가지:
1. 반구 셰이딩/스페큘러 레이어의 `clipPath: inset(0 0 35% 0)` / `inset(0 0 40% 0)` — **65~60% 지점에 수평 하드 컷**이 생김. 이게 가장 도드라지는 직선.
2. 현재 radial-gradient 분리 링이 너무 옅고 부드러워 곡선이 시각적으로 약함.

## 변경 파일
- `src/components/confesta/ScoopCard.tsx`

## 수정 내용

### (A) 하드 수평 컷 제거
반구 셰이딩 두 레이어에서 `clipPath` 제거. 대신 radial-gradient 자체의 페이드로 본체 영역만 자연스럽게 밝아지게 한다.

```jsx
// 반구 볼륨 셰이딩 (clipPath 제거, 그라데이션만으로 본체 영역 한정)
background: radial-gradient(ellipse 70% 55% at 35% 22%,
  rgba(255,255,255,0.55) 0%,
  rgba(255,255,255,0.15) 35%,
  rgba(255,255,255,0) 55%,
  rgba(0,0,0,0.18) 75%,
  rgba(0,0,0,0) 100%)

// specular (clipPath 제거)
background: radial-gradient(circle 70px at 28% 22%, rgba(255,255,255,0.95), transparent 70%)
```

### (B) 곡선 분리 경계선 — SVG로 정확한 U자 곡선
CSS radial은 타원이라 곡률 제어가 거칠다. **SVG `<path>` 두 개**로 정확한 U자 곡선을 그린다 — 어두운 메인 그림자 + 바로 아래 얇은 밝은 림. 마스크 안쪽에 `absolute inset-0` overlay로 배치.

곡선 패스 (viewBox `0 0 100 100`): 양 끝 y≈55, 중간 y≈75 지점을 부드러운 베지에로 연결.
```
M 5,55 Q 50,82 95,55
```

```jsx
<svg
  className="absolute inset-0 w-full h-full pointer-events-none"
  viewBox="0 0 100 100"
  preserveAspectRatio="none"
>
  {/* 어두운 곡선 그림자 띠 */}
  <path
    d="M 5,55 Q 50,82 95,55"
    stroke="rgba(0,0,0,0.32)"
    strokeWidth="3.5"
    fill="none"
    strokeLinecap="round"
    style={{ filter: "blur(2px)" }}
  />
  {/* 곡선 바로 아래 얇은 밝은 림 */}
  <path
    d="M 5,58 Q 50,85 95,58"
    stroke="rgba(255,255,255,0.22)"
    strokeWidth="1.2"
    fill="none"
    strokeLinecap="round"
    style={{ filter: "blur(0.6px)" }}
  />
</svg>
```

기존 radial-gradient 기반 곡선 링 2개는 제거.

### (C) 스커트 음영 (유지)
linear-gradient로 본체 아래 영역 톤다운 — 그대로.

## 기대 효과
- 수평 하드 컷이 사라져, **곡선만 시각적으로 남음**
- SVG path로 그린 U자 곡선이 사용자가 그린 빨간 선과 동일한 형태로 본체 바닥을 따라 휘어 보임
- 곡선 아래 얇은 밝은 림 → 단차 강조
