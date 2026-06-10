## 문제
현재 본체↔스커트 경계선이 `linear-gradient(to bottom, ...)` 라서 **수평 직선**으로 보인다. 본체가 구(球)인데 경계가 직선이면 어색.

## 해결
경계선을 **radial-gradient의 원형 링**으로 그려, 구의 아래쪽 곡선을 따라 휘어진 어두운 띠가 생기게 한다.

## 변경 파일
- `src/components/confesta/ScoopCard.tsx` — 경계 레이어 2개(직선)를 radial 곡선 링으로 교체

## 셰이딩 교체 디테일

**기존 (직선 경계)**
```
linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.35) 66%, ... 72%, transparent 78%)
```
→ 제거.

**신규 경계선 (구의 바닥 곡선)**
본체(반구)를 가상의 원으로 가정 — 정사각형 마스크 안에서 중심 (50%, 32%), 반지름 ~50% 정도. 이 원의 가장자리에 얇은 어두운 링을 깔면 본체 바닥이 곡선으로 휘어 보인다.

```css
/* 본체 바닥 곡선 그림자 (어두운 곡선 띠) */
background: radial-gradient(
  ellipse 62% 62% at 50% 32%,
  transparent 0%,
  transparent 92%,
  rgba(0,0,0,0.40) 96%,
  rgba(0,0,0,0.25) 99%,
  transparent 102%
);
```

```css
/* 곡선 바로 아래 얇은 밝은 림 (단차 강조) */
background: radial-gradient(
  ellipse 62% 62% at 50% 32%,
  transparent 0%,
  transparent 99%,
  rgba(255,255,255,0.22) 101%,
  transparent 105%
);
```

**스커트 음영** (기존 linear는 본체 아래 전반 톤다운용으로 유지하되 시작점을 70%로 늦춰 곡선 띠와 겹치지 않게)
```
linear-gradient(to bottom, transparent 70%, rgba(0,0,0,0.10) 82%, rgba(0,0,0,0.22) 100%)
```

## 기대 효과
- 본체와 스커트 경계가 **아래로 휘어진 곡선**으로 보임 → 구가 스커트 위에 얹힌 듯
- 어두운 띠 + 얇은 밝은 림 → 부드럽지만 분명한 단차
- 마스크/실루엣/색상 토큰은 그대로
