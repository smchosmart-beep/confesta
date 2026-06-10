import { useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { useConfestaStore, getToppingGate } from "@/lib/confesta/store";
import { MessageSquare, Hash } from "lucide-react";

interface Props {
  sessionId: string;
}

export function ToppingGateControl({ sessionId }: Props) {
  const gates = useConfestaStore((s) => s.toppingGates);
  const setGate = useConfestaStore((s) => s.setToppingGate);
  const toppings = useConfestaStore((s) => s.toppings);

  const gate = getToppingGate(gates, sessionId);

  const counts = useMemo(() => {
    let q = 0;
    let a = 0;
    for (const t of toppings) {
      if (t.sessionId !== sessionId) continue;
      if (t.kind === "answer") a++;
      else q++;
    }
    return { q, a };
  }, [toppings, sessionId]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-card shadow-cream p-4">
      <div className="absolute inset-0 bg-grad-aurora-soft opacity-30 pointer-events-none" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold">청중 토핑 입력 제어</h3>
          <span className="text-[11px] font-mono text-muted-foreground">
            질문 {counts.q} · 응답 {counts.a}
          </span>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-white/60 border border-white/70 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="w-4 h-4 text-primary" />
            질문 받기
          </span>
          <Switch
            checked={gate.questionsOpen}
            onCheckedChange={(v) => setGate(sessionId, { questionsOpen: v })}
          />
        </label>

        <div className="rounded-xl bg-white/60 border border-white/70 px-3 py-2 flex flex-col gap-2">
          <label className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Hash className="w-4 h-4 text-primary" />
              키워드 응답 받기
            </span>
            <Switch
              checked={gate.answersOpen}
              onCheckedChange={(v) => setGate(sessionId, { answersOpen: v })}
            />
          </label>

          {gate.answersOpen && (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={gate.answerPrompt}
                onChange={(e) =>
                  setGate(sessionId, { answerPrompt: e.target.value })
                }
                placeholder="발문 예: 가장 인상 깊은 단어 한 개"
                maxLength={60}
                className="w-full rounded-full bg-card border border-white/80 px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground px-1">
                청중 응답 입력창 위에 발문이 카드로 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
