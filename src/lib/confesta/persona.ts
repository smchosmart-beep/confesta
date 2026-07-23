import type { StackedScoop, CategoryKey } from "./types";
import { SESSIONS } from "./mockData";

export interface Persona {
  title: string;       // e.g. "열정적인 프롬프트 탐험가"
  emoji: string;
  tagline: string;     // short description
  accent: string;      // tailwind bg-grad-* token for the badge
}

const PERSONA_BY_CATEGORY: Record<CategoryKey, Persona> = {
  "vision-keynote": {
    title: "비전 얼리 캐처",
    emoji: "🔭",
    tagline: "새로운 교육의 방향을 가장 먼저 포착하는 참가자",
    accent: "bg-grad-strawberry",
  },
  conference: {
    title: "인사이트 수집가",
    emoji: "📚",
    tagline: "컨퍼런스에서 얻은 통찰을 차곡차곡 모으는 참가자",
    accent: "bg-grad-blueberry",
  },
  "class-share": {
    title: "수업 레시피 러버",
    emoji: "🍯",
    tagline: "다른 선생님의 수업 레시피를 내 것으로 만드는 참가자",
    accent: "bg-grad-mint",
  },
  networking: {
    title: "선도교사 네트워커",
    emoji: "🤝",
    tagline: "동료와 연결되며 함께 성장하는 참가자",
    accent: "bg-grad-mango",
  },
  "leader-school": {
    title: "선도학교 벤치마커",
    emoji: "🏫",
    tagline: "앞선 학교의 사례에서 우리 학교의 다음을 찾는 참가자",
    accent: "bg-grad-chocolate",
  },
  parents: {
    title: "가정-교실 브리지",
    emoji: "🌉",
    tagline: "가정과 교실을 잇는 배움을 고민하는 참가자",
    accent: "bg-grad-strawberry",
  },
  hackathon: {
    title: "직접 만들어보는 메이커",
    emoji: "🛠️",
    tagline: "듣기보다 손으로 만들며 배우는 실행형 참가자",
    accent: "bg-grad-blueberry",
  },
};

const MIXED: Persona = {
  title: "전방위 콘페스타 러너",
  emoji: "🌈",
  tagline: "비전·수업·네트워킹·해커톤을 넘나드는 통합형 참가자",
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
