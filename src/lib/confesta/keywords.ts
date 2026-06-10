// Lightweight Korean keyword extractor for topping visualizations.
// No external morphological analyzer — heuristics only.

const STOP = new Set([
  // English
  "the", "and", "for", "you", "are", "with", "this", "that",
  // 일반 한국어 불용어
  "그리고", "그래서", "그러나", "하지만", "또한", "정말", "진짜", "매우", "조금",
  "그것", "이것", "저것", "여기", "저기", "거기", "때문", "관련", "통해", "대해",
  "그런", "이런", "저런", "어떤", "무슨", "어떻게", "어디", "언제", "누구", "무엇",
  "있는", "있어요", "있습니다", "없는", "없어요", "없습니다",
  "하는", "하면", "해요", "합니다", "해주세요", "주세요", "부탁", "부탁드립니다",
  "되는", "되어", "된다", "됩니다", "같은", "같이", "같다",
  "수", "좀", "더", "또", "잘", "안", "못", "은", "는", "이", "가", "을", "를", "의",
  "에", "도", "만", "과", "와", "로", "요", "에서", "까지", "부터",
]);

// 어미·서술어로 끝나는 토큰은 제외 (조사 스트립 후 검사)
const PREDICATE_SUFFIX = [
  "합니다", "할까요", "했어요", "했습니다", "했다", "한다", "하다",
  "됩니다", "됐어요", "됐습니다", "되었다", "된다", "되다",
  "있습니다", "있어요", "있다", "없습니다", "없어요", "없다",
  "예요", "이에요", "에요", "이다", "네요", "군요", "거든요", "잖아요",
  "같아요", "같습니다", "같다", "싶어요", "싶습니다", "싶다",
];

// 토큰 끝에서 반복 제거할 조사·어미 (긴 것 먼저)
const PARTICLES = [
  "이라고", "라고는", "이라는", "라는", "에서는", "에서도", "으로는", "으로도", "까지는", "부터는",
  "에게서", "한테서", "이라", "이며", "이고", "이면", "이란",
  "에서", "에게", "한테", "으로", "까지", "부터", "라고", "이며", "이고",
  "께서", "께", "은", "는", "이", "가", "을", "를", "의", "에", "도", "만",
  "과", "와", "로", "요", "랑", "이나", "나", "야", "여",
];

function stripParticles(token: string): string {
  let t = token;
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of PARTICLES) {
      if (t.length > p.length + 1 && t.endsWith(p)) {
        t = t.slice(0, -p.length);
        changed = true;
        break;
      }
    }
  }
  return t;
}

function isPredicate(token: string): boolean {
  return PREDICATE_SUFFIX.some((s) => token.endsWith(s));
}

const HANGUL_RE = /[\uac00-\ud7af]/;
const ASCII_ONLY_RE = /^[A-Za-z0-9]+$/;

export function extractKeywords(texts: string[]): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const raw = text
      .replace(/[.,!?…"'`~()\[\]{}<>+=*/\\|:;]/g, " ")
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);

    for (const r of raw) {
      if (isPredicate(r)) continue;
      let w = HANGUL_RE.test(r) ? stripParticles(r) : r;
      if (!w) continue;
      if (isPredicate(w)) continue;
      const low = w.toLowerCase();
      if (STOP.has(low)) continue;
      // 길이 필터
      if (ASCII_ONLY_RE.test(w)) {
        if (w.length < 3) continue;
      } else {
        if (w.length < 2) continue;
      }
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}
