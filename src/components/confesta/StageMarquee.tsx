import { useConfestaStore } from "@/lib/confesta/store";

interface Props {
  sessionId: string;
}

export function StageMarquee({ sessionId }: Props) {
  const toppings = useConfestaStore((s) =>
    s.toppings.filter((t) => t.sessionId === sessionId),
  );

  const sorted = [...toppings]
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    })
    .slice(0, 12);

  if (sorted.length === 0) {
    return (
      <div className="bg-card border border-border rounded-3xl p-5 text-center text-muted-foreground">
        실시간 질문이 이곳에 흐릅니다.
      </div>
    );
  }

  // Duplicate for seamless loop
  const loop = [...sorted, ...sorted];

  return (
    <div className="relative overflow-hidden bg-card border border-border rounded-3xl py-4">
      <div className="flex gap-4 whitespace-nowrap animate-[stage-marquee_45s_linear_infinite]">
        {loop.map((t, i) => (
          <span
            key={`${t.id}-${i}`}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold shadow-cream ${
              t.pinned
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
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
