import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Lock, Megaphone } from "lucide-react";
import type { AnswerPromptDTO } from "@/lib/confesta/prompts.functions";
import { useSessionToppings } from "@/hooks/use-toppings";
import { useToppingGate } from "@/hooks/use-topping-gate";
import { AnswerPie } from "./AnswerPie";


interface Props {
  prompt: AnswerPromptDTO;
}

export function AnswerPromptCard({ prompt }: Props) {
  const { toppings, submit } = useSessionToppings(prompt.sessionId);
  const { gate } = useToppingGate(prompt.sessionId);

  const isActive = prompt.closedAt == null;
  const canSubmit = gate.answersOpen;

  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 192) + "px";
  }, [text]);

  const total = useMemo(
    () =>
      toppings.filter((t) => t.kind === "answer" && t.promptId === prompt.id)
        .length,
    [toppings, prompt.id],
  );


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !canSubmit) return;
    try {
      const r = await submit(t, "answer", prompt.id);
      if (!r.ok) {
        toast.error(r.message ?? "응답을 보낼 수 없어요");
        return;
      }
    } catch (err) {
      console.error(err);
      toast.error("전송 중 오류가 발생했어요");
      return;
    }
    setText("");
  };

  return (
    <div
      className={`relative overflow-hidden bg-card rounded-3xl p-5 shadow-cream border ${
        isActive ? "border-white/60" : "border-muted/50 opacity-90"
      }`}
    >
      <div
        className={`absolute inset-0 ${isActive ? "bg-grad-sunset-soft opacity-50" : "bg-grad-muted opacity-30"}`}
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <Megaphone
            className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? "text-pink-700" : "text-muted-foreground"}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isActive
                    ? "bg-grad-strawberry text-white shadow-pink"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isActive ? "진행 중" : "보관됨"}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                응답 {total}
              </span>
            </div>
            <h4 className="mt-1 text-sm font-bold text-foreground break-keep">
              {prompt.text}
            </h4>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`flex flex-col gap-2 bg-card border border-white/60 rounded-2xl p-3 shadow-pink ${
              !canSubmit ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              {canSubmit ? (
                <Megaphone className="w-4 h-4 text-primary shrink-0 mt-1.5" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-1.5" />
              )}
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  canSubmit
                    ? isActive
                      ? "한 단어로 응답해 보세요"
                      : "보관된 질문에도 응답할 수 있어요"
                    : "응답 수신이 꺼져 있어요"
                }
                disabled={!canSubmit}
                rows={1}
                maxLength={24}
                style={{ maxHeight: 192 }}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm py-1.5 resize-none overflow-y-auto disabled:cursor-not-allowed leading-relaxed break-words"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pl-6">
              <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                {text.length}/24
              </span>
              <button
                type="submit"
                disabled={!text.trim() || !canSubmit}
                className="bounce-press inline-flex items-center gap-1.5 bg-grad-strawberry text-white rounded-full px-4 py-2 text-xs font-bold shadow-pink disabled:opacity-40 disabled:hover:scale-100"
                aria-label="응답 보내기"
              >
                <Send className="w-3.5 h-3.5" />
                보내기
              </button>
            </div>
          </div>
        </form>

        <div className="w-full h-80">
          <AnswerPie sessionId={prompt.sessionId} promptId={prompt.id} />
        </div>

      </div>
    </div>
  );
}
