import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfestaStore, getToppingGate } from "@/lib/confesta/store";
import { Send, Sparkles, MessageSquare, Hash, Lock, Megaphone } from "lucide-react";
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
  const gates = useConfestaStore((s) => s.toppingGates);
  const gate = getToppingGate(gates, sessionId);
  const idRef = useRef(0);

  const isOpen = (k: ToppingKind) =>
    k === "answer" ? gate.answersOpen : gate.questionsOpen;
  const currentOpen = isOpen(kind);

  // 현재 모드가 닫혀있고 다른 모드가 열려있다면 자동으로 열린 모드로 전환
  useEffect(() => {
    if (!currentOpen) {
      const other: ToppingKind = kind === "question" ? "answer" : "question";
      if (isOpen(other)) setKind(other);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.questionsOpen, gate.answersOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!currentOpen) {
      toast.error("발표자가 아직 받지 않아요");
      return;
    }
    const ok = addTopping(sessionId, text.trim(), kind);
    if (!ok) {
      toast.error("발표자가 방금 입력을 닫았어요");
      return;
    }
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
  const placeholder = currentOpen
    ? current.hint
    : "발표자가 곧 열어드려요";

  const handleTabClick = (v: ToppingKind) => {
    setKind(v);
    if (!isOpen(v)) {
      toast("발표자가 아직 받지 않아요", {
        description:
          v === "answer"
            ? "발표자가 키워드 응답 모드를 열면 입력할 수 있어요."
            : "발표자가 질문 받기 모드를 열면 입력할 수 있어요.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex self-start gap-1 p-1 bg-muted rounded-full shadow-cream">
        {tabs.map((t) => {
          const open = isOpen(t.value);
          const active = kind === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTabClick(t.value)}
              className={`bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-primary text-primary-foreground shadow-pink"
                  : "text-foreground/70"
              } ${!open ? "opacity-60" : ""}`}
              aria-pressed={active}
            >
              {open ? t.icon : <Lock className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {kind === "answer" && gate.answersOpen && gate.answerPrompt.trim() && (
        <div className="relative overflow-hidden rounded-2xl bg-grad-sunset-soft border border-white/70 px-4 py-3 shadow-cream">
          <div className="flex items-start gap-2">
            <Megaphone className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-pink-700 uppercase tracking-wider">
                발표자의 질문
              </div>
              <div className="text-sm font-semibold text-foreground">
                {gate.answerPrompt}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`flex items-center gap-2 bg-card border border-white/60 rounded-full p-1.5 pl-5 shadow-pink ${
            !currentOpen ? "opacity-60" : ""
          }`}
        >
          <Sparkles className="w-5 h-5 text-primary shrink-0" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={!currentOpen}
            className="flex-1 bg-transparent outline-none text-sm py-2 disabled:cursor-not-allowed"
            maxLength={kind === "answer" ? 24 : 140}
          />
          <button
            type="submit"
            disabled={!text.trim() || !currentOpen}
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
