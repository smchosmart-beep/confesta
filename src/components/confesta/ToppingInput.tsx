import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Sparkles, MessageSquare, Hash, Lock, Megaphone } from "lucide-react";
import type { ToppingKind } from "@/lib/confesta/types";
import { useSessionToppings } from "@/hooks/use-toppings";
import { useToppingGate } from "@/hooks/use-topping-gate";

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
  kind?: ToppingKind;
  onKindChange?: (k: ToppingKind) => void;
  disableAnswerSubmit?: boolean;
}

export function ToppingInput({ sessionId, kind: kindProp, onKindChange, disableAnswerSubmit = false }: Props) {
  const [kindState, setKindState] = useState<ToppingKind>("question");
  const kind = kindProp ?? kindState;
  const setKind = (k: ToppingKind) => {
    if (onKindChange) onKindChange(k);
    else setKindState(k);
  };
  const [text, setText] = useState("");
  const [sprinkles, setSprinkles] = useState<Sprinkle[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { submit } = useSessionToppings(sessionId);

  const autosize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 192) + "px";
  };
  useEffect(() => {
    autosize();
  }, [text]);
  const { gate } = useToppingGate(sessionId);
  const idRef = useRef(0);

  const isOpen = (k: ToppingKind) =>
    k === "answer" ? gate.answersOpen : gate.questionsOpen;
  const currentOpen = isOpen(kind);

  useEffect(() => {
    if (!currentOpen) {
      const other: ToppingKind = kind === "question" ? "answer" : "question";
      if (isOpen(other)) setKind(other);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate.questionsOpen, gate.answersOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (!currentOpen) {
      toast.error("발표자가 아직 받지 않아요");
      return;
    }
    try {
      const r = await submit(text.trim(), kind);
      if (!r.ok) {
        toast.error(r.message ?? "전송하지 못했어요");
        return;
      }
    } catch (err) {
      console.error(err);
      toast.error("전송 중 오류가 발생했어요");
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
  const placeholder = currentOpen ? current.hint : "발표자가 곧 열어드려요";

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
                active ? "bg-primary text-primary-foreground shadow-pink" : "text-foreground/70"
              } ${!open ? "opacity-60" : ""}`}
              aria-pressed={active}
            >
              {open ? t.icon : <Lock className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {kind === "answer" && disableAnswerSubmit ? (
        <div className="relative overflow-hidden rounded-2xl bg-grad-sunset-soft border border-white/70 px-4 py-3 shadow-cream">
          <div className="flex items-start gap-2">
            <Megaphone className="w-4 h-4 text-pink-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-pink-700 uppercase tracking-wider">
                키워드 응답 모드
              </div>
              <div className="text-sm font-semibold text-foreground">
                아래 질문 카드에서 응답해 주세요.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`flex flex-col gap-2 bg-card border border-white/60 rounded-2xl p-3 shadow-pink ${
              !currentOpen ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-1.5" />
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                disabled={!currentOpen}
                rows={1}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm py-1.5 resize-none overflow-y-auto disabled:cursor-not-allowed leading-relaxed break-words"
                style={{ maxHeight: 192 }}
                maxLength={kind === "answer" ? 24 : 140}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pl-7">
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                {text.length}/{kind === "answer" ? 24 : 140}
              </span>
              <button
                type="submit"
                disabled={!text.trim() || !currentOpen}
                className="bounce-press inline-flex items-center gap-1.5 bg-grad-strawberry text-white rounded-full px-4 py-2 text-xs font-bold shadow-pink disabled:opacity-40 disabled:hover:scale-100"
                aria-label="토핑 전송"
              >
                <Send className="w-3.5 h-3.5" />
                보내기
              </button>
            </div>
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
      )}
    </div>
  );
}
