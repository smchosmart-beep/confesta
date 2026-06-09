import { useRef, useState } from "react";
import { useConfestaStore } from "@/lib/confesta/store";
import { Send, Sparkles } from "lucide-react";

interface Sprinkle {
  id: number;
  drift: number;
  spin: number;
  left: number;
  color: string;
  delay: number;
}

const COLORS = [
  "var(--scoop-strawberry)",
  "var(--scoop-mango)",
  "var(--scoop-mint)",
  "var(--scoop-blueberry)",
  "var(--primary)",
  "var(--secondary)",
];

interface Props {
  sessionId: string;
}

export function ToppingInput({ sessionId }: Props) {
  const [text, setText] = useState("");
  const [sprinkles, setSprinkles] = useState<Sprinkle[]>([]);
  const addTopping = useConfestaStore((s) => s.addTopping);
  const idRef = useRef(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTopping(sessionId, text.trim());
    // Spawn sprinkles
    const next: Sprinkle[] = Array.from({ length: 12 }, () => ({
      id: ++idRef.current,
      drift: Math.random() * 200 - 100,
      spin: Math.random() * 720 - 360,
      left: 30 + Math.random() * 40,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 150,
    }));
    setSprinkles((prev) => [...prev, ...next]);
    setText("");
    setTimeout(() => {
      setSprinkles((prev) => prev.filter((s) => !next.find((n) => n.id === s.id)));
    }, 1800);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 bg-card border border-border rounded-full p-1.5 pl-5 shadow-cream">
        <Sparkles className="w-5 h-5 text-primary shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="라이브 질문이나 감상을 토핑처럼 보내보세요!"
          className="flex-1 bg-transparent outline-none text-sm py-2"
          maxLength={140}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="bounce-press bg-primary text-primary-foreground rounded-full p-2.5 disabled:opacity-40 disabled:hover:scale-100"
          aria-label="토핑 전송"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Sprinkle layer */}
      <div className="pointer-events-none absolute inset-x-0 -top-2 h-2">
        {sprinkles.map((s) => (
          <span
            key={s.id}
            className="absolute block rounded-full"
            style={
              {
                left: `${s.left}%`,
                top: 0,
                width: 8,
                height: 8,
                backgroundColor: s.color,
                animation: "var(--animate-topping-fly)",
                animationDelay: `${s.delay}ms`,
                ["--drift" as string]: `${s.drift}px`,
                ["--spin" as string]: `${s.spin}deg`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </form>
  );
}
