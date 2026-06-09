import { useEffect, useMemo, useState } from "react";
import { useConfestaStore } from "@/lib/confesta/store";
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
  const toppings = useConfestaStore((s) =>
    s.toppings.filter((t) => t.sessionId === sessionId),
  );
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
      color: FLAVORS[i % FLAVORS.length],
    }));
    // include tick to refresh animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toppings, compact, tick]);

  if (cloud.length === 0) {
    return (
      <div
        className={`bg-card border border-border rounded-3xl flex items-center justify-center text-center text-muted-foreground ${
          compact ? "p-8 text-sm" : "p-16"
        }`}
      >
        토핑이 도착하면 키워드가 모입니다 🍒
      </div>
    );
  }

  return (
    <div
      className={`bg-card border border-border rounded-3xl shadow-cream flex flex-wrap items-center justify-center gap-x-4 gap-y-2 ${
        compact ? "p-5 min-h-[180px]" : "p-10 min-h-[320px]"
      }`}
    >
      {cloud.map((w, i) => (
        <span
          key={`${w.word}-${tick}-${i}`}
          className="font-extrabold leading-none animate-scale-in"
          style={{
            fontSize: `${w.size}px`,
            color: w.color,
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
