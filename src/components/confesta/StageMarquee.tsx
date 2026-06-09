import { useMemo } from "react";
import { useConfestaStore } from "@/lib/confesta/store";

interface Props {
  sessionId: string;
}

export function StageMarquee({ sessionId }: Props) {
  const allToppings = useConfestaStore((s) => s.toppings);
  const sorted = useMemo(
    () =>
      allToppings
        .filter((t) => t.sessionId === sessionId)
        .sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.createdAt - a.createdAt;
        })
        .slice(0, 12),
    [allToppings, sessionId],
  );

  if (sorted.length === 0) {
    return (
      <div className="relative overflow-hidden bg-card border border-white/60 rounded-3xl p-5 text-center text-muted-foreground">
        <div className="absolute inset-0 bg-grad-cream opacity-70" />
        <span className="relative">실시간 질문이 이곳에 흐릅니다.</span>
      </div>
    );
  }

  // Duplicate for seamless loop
  const loop = [...sorted, ...sorted];

  return (
    <div className="relative overflow-hidden border border-white/60 rounded-3xl py-4">
      <div className="absolute inset-0 bg-grad-cream" />
      <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />
      <div className="relative flex gap-4 whitespace-nowrap animate-[stage-marquee_45s_linear_infinite]">
        {loop.map((t, i) => (
          <span
            key={`${t.id}-${i}`}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold shadow-cream ${
              t.pinned
                ? "bg-grad-strawberry text-white shadow-pink"
                : "bg-white/80 backdrop-blur text-foreground"
            }`}
          >
            {t.pinned && "📌"} {t.text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes stage-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
