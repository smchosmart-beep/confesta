import { useEffect, useMemo, useState } from "react";
import { useSessionToppings } from "@/hooks/use-toppings";
import { ToppingScatter } from "./ToppingDecor";

const FLAVOR_GRADIENTS = [
  "var(--gradient-strawberry)",
  "var(--gradient-mint)",
  "var(--gradient-mango)",
  "var(--gradient-blueberry)",
  "var(--gradient-sunset)",
  "var(--gradient-aurora)",
];

// Korean/English-friendly stopword set
const STOP = new Set([
  "그리고", "그래서", "정말", "있는", "있어요", "있습니다", "하는", "하면",
  "해요", "해주세요", "부탁", "부탁드립니다", "부탁드려요", "수", "좀",
  "더", "또", "the", "and", "for", "you", "are", "with",
]);

function tokenize(text: string): string[] {
  return text
    .replace(/[.,!?…"'`~()\[\]{}<>+=*/\\|:;]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP.has(w.toLowerCase()));
}

interface Props {
  sessionId: string;
  compact?: boolean;
}

export function ToppingWordCloud({ sessionId, compact = false }: Props) {
  const { toppings } = useSessionToppings(sessionId);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  const cloud = useMemo(() => {
    const counts = new Map<string, number>();
    toppings.forEach((t) => {
      tokenize(t.text).forEach((w) => {
        counts.set(w, (counts.get(w) ?? 0) + 1);
      });
    });
    const arr = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25);
    const max = arr[0]?.[1] ?? 1;
    return arr.map(([word, count], i) => ({
      word,
      count,
      size: compact
        ? 14 + (count / max) * 24
        : 22 + (count / max) * 64,
      gradient: FLAVOR_GRADIENTS[i % FLAVOR_GRADIENTS.length],
    }));
    // include tick to refresh animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toppings, compact, tick]);

  if (cloud.length === 0) {
    return (
      <div
        className={`relative overflow-hidden bg-card border border-white/60 rounded-3xl flex items-center justify-center text-center text-muted-foreground ${
          compact ? "p-8 text-sm" : "p-16"
        }`}
      >
        <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
        <ToppingScatter density="low" seed="wc-empty" />
        <span className="relative">토핑이 도착하면 키워드가 모입니다 🍒</span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden border border-white/60 rounded-3xl shadow-cream flex flex-wrap items-center justify-center gap-x-4 gap-y-2 ${
        compact ? "p-5 min-h-[180px]" : "p-10 min-h-[320px]"
      }`}
    >
      <div className="absolute inset-0 bg-grad-cream" />
      <div className="absolute inset-0 bg-grad-sunset-soft opacity-40" />
      <ToppingScatter density={compact ? "low" : "med"} seed="wc-bg" />
      {cloud.map((w, i) => (
        <span
          key={`${w.word}-${tick}-${i}`}
          className="relative font-extrabold leading-none animate-scale-in bg-clip-text text-transparent"
          style={{
            fontSize: `${w.size}px`,
            backgroundImage: w.gradient,
            WebkitBackgroundClip: "text",
            animationDelay: `${i * 30}ms`,
          }}
          title={`${w.count}회`}
        >
          {w.word}
        </span>
      ))}
    </div>
  );
}
