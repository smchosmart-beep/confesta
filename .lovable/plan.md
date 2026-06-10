## 문제
컨텐츠 영역이 정사각 컨테이너 기준 `pt-5 pb-[18%]`라 중심이 y≈41% 부근. 돔 바닥이 y≈65%(가장자리는 y≈52%)인데 컨텐츠가 중앙 아래로 내려가 있어 텍스트/설명 일부가 경계선에 닿거나 밖으로 보인다.

## 목표
모든 컨텐츠(아이콘 + label + 제목 + desc)가 돔 실루엣 안에 들어오도록 위치 조정. 컨텐츠 중심을 y≈32%로 올리고, 좁아지는 가장자리에 맞춰 가로 패딩도 살짝 조정.

## 파일
- `src/components/confesta/ScoopCard.tsx` (컨텐츠 컨테이너 한 줄)

## 수정
```jsx
// before
className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pt-5"
style={{ paddingBottom: "18%" }}

// after
className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pt-4"
style={{ paddingBottom: "42%" }}
```

- `paddingBottom: 42%` → 컨텐츠 영역 0..58%, 중심 y≈29% → 돔 안쪽 상단~중앙
- `pt-4` → 아이콘이 너무 위로 붙지 않게 살짝 여유
- `px-8` (40→32px) → 가로는 여유. 돔 가장 넓은 부분이 y≈30%라 여기서는 거의 100% 폭 사용 가능

요소 간격은 그대로 유지 (`mb-3`, `mt-0.5`, `mt-1.5`).
