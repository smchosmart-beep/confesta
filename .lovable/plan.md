## 작업
키워드 응답을 집계할 때 **한글 띄어쓰기**와 **영문 대소문자**를 무시하고 동일한 키워드로 묶이도록 정규화.

예시 (모두 같은 키워드로 카운트):
- "사과 파이" = "사과파이" = " 사 과 파 이 "
- "Apple" = "apple" = "APPLE"
- "Ice Cream" = "icecream" = "ICE CREAM"

## 변경

### 1. `src/lib/confesta/keywords.ts` — 새 함수 추가
기존 `extractKeywords`(여러 토큰으로 쪼개는 형태소 휴리스틱)는 그대로 두고, **응답 전체를 하나의 키워드로 취급**하는 새 함수 추가:

```ts
export function extractAnswerKeywords(
  texts: string[],
): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  const display = new Map<string, string>(); // 정규화 키 → 첫 등장 표시형
  for (const text of texts) {
    const trimmed = text.trim();
    if (!trimmed) continue;
    // 정규화 키: 모든 공백 제거 + 소문자
    const key = trimmed.replace(/\s+/g, "").toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!display.has(key)) display.set(key, trimmed);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ word: display.get(key) ?? key, count }))
    .sort((a, b) => b.count - a.count);
}
```

### 2. `src/components/confesta/ToppingTubScene.tsx` (line 2, 58-62)
- import 교체: `extractKeywords` → `extractAnswerKeywords`
- 호출부도 교체

다른 곳(`extractKeywords` 사용처는 ToppingTubScene 한 곳뿐)에는 영향 없음. 기존 함수는 제거하지 않고 보존.

## 영향 범위
- `src/lib/confesta/keywords.ts` — 함수 추가
- `src/components/confesta/ToppingTubScene.tsx` — 2줄 변경
- 백엔드/저장 로직 변경 없음 (원본 텍스트는 그대로 저장, 집계 단계에서만 정규화)
