import type { StackedScoop, CategoryKey } from "./types";
import { SESSIONS } from "./mockData";

export interface Persona {
  title: string;       // e.g. "열정적인 프롬프트 탐험가"
  emoji: string;
  tagline: string;     // short description
  accent: string;      // tailwind bg-grad-* token for the badge
}

const PERSONA_BY_CATEGORY: Record<CategoryKey, Persona> = {
  "ai-math": {
    title: "열정적인 프롬프트 탐험가",
    emoji: "🧪",
    tagline: "AI와 수학을 잇는 새 길을 끊임없이 시도하는 유형",
    accent: "bg-grad-mint",
  },
  edutech: {
    title: "디지털 도구 큐레이터",
    emoji: "🛠️",
    tagline: "수업에 꼭 맞는 에듀테크를 골라 쓰는 실용주의자",
    accent: "bg-grad-blueberry",
  },
  pedagogy: {
    title: "수업 설계 장인",
    emoji: "🎨",
    tagline: "배움의 흐름을 정교하게 설계하는 교수법 연구가",
    accent: "bg-grad-strawberry",
  },
  research: {
    title: "현장 연구 기록자",
    emoji: "🔬",
    tagline: "수업 데이터에서 의미를 발굴하는 교사-연구자",
    accent: "bg-grad-mango",
  },
  policy: {
    title: "정책 인사이트 수집가",
    emoji: "🗺️",
    tagline: "큰 그림과 제도를 함께 읽는 교육 전략가",
    accent: "bg-grad-sunset",
  },
};

const MIXED: Persona = {
  title: "전방위 융합 러너",
  emoji: "🌈",
  tagline: "수학·정책·도구·연구를 가로지르는 통합형 교육자",
  accent: "bg-grad-sunset",
};

export function derivePersona(scoops: StackedScoop[]): Persona {
  if (scoops.length === 0) return MIXED;

  const counts = new Map<CategoryKey, number>();
  for (const s of scoops) {
    const session = SESSIONS.find((x) => x.id === s.sessionId);
    const cat: CategoryKey = session?.category ?? "ai-math";
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  if (counts.size >= 3) return MIXED;

  let best: CategoryKey =
    SESSIONS.find((x) => x.id === scoops[0].sessionId)?.category ?? "ai-math";
  let bestCount = 0;
  for (const [cat, n] of counts) {
    if (n > bestCount) {
      best = cat;
      bestCount = n;
    }
  }
  return PERSONA_BY_CATEGORY[best] ?? MIXED;
}
