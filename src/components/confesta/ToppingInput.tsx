import { useRef, useState } from "react";
import { useConfestaStore } from "@/lib/confesta/store";
import { Send, Sparkles, MessageSquare, Hash } from "lucide-react";
import type { ToppingKind } from "@/lib/confesta/types";

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
  const [kind, setKind] = useState<ToppingKind>("question");
  const [text, setText] = useState("");
  const [sprinkles, setSprinkles] = useState<Sprinkle[]>([]);
  const addTopping = useConfestaStore((s) => s.addTopping);
  const idRef = useRef(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addTopping(sessionId, text.trim(), kind);
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

  const tabs: { value: ToppingKind; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      value: "question",
      label: "질문하기",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      hint: "발표자에게 궁금한 점을 물어보세요",
    },
    {
      value: "answer",
      label: "키워드 응답",
      icon: <Hash className="w-3.5 h-3.5" />,
      hint: "발표자가 던진 질문에 짧게 답해보세요 (한 단어 추천)",
    },
  ];
  const current = tabs.find((t) => t.value === kind)!;

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex self-start gap-1 p-1 bg-muted rounded-full shadow-cream">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setKind(t.value)}
            className={`bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              kind === t.value
                ? "bg-primary text-primary-foreground shadow-pink"
                : "text-foreground/70"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 bg-card border border-white/60 rounded-full p-1.5 pl-5 shadow-pink">
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={current.hint}
            className="flex-1 bg-transparent outline-none text-sm py-2"
            maxLength={kind === "answer" ? 24 : 140}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="bounce-press bg-grad-strawberry text-white rounded-full p-2.5 shadow-pink disabled:opacity-40 disabled:hover:scale-100"
            aria-label="토핑 전송"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

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
    </div>
  );
}
