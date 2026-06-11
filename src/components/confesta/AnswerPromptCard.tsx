import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Send, Lock, Megaphone } from "lucide-react";
import type { AnswerPromptDTO } from "@/lib/confesta/prompts.functions";
import { useSessionToppings } from "@/hooks/use-toppings";
import { useToppingGate } from "@/hooks/use-topping-gate";

const PALETTE = [
  "var(--scoop-strawberry)",
  "var(--scoop-mango)",
  "var(--scoop-mint)",
  "var(--scoop-blueberry)",
  "var(--scoop-grape)",
  "var(--scoop-chocolate)",
  "var(--muted-foreground)",
];

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

  const answers = useMemo(
    () => toppings.filter((t) => t.kind === "answer" && t.promptId === prompt.id),
    [toppings, prompt.id],
  );
  const total = answers.length;

  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of answers) {
      const key = a.text.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const sorted = [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const TOP = 6;
    if (sorted.length <= TOP) return sorted;
    const top = sorted.slice(0, TOP);
    const restSum = sorted.slice(TOP).reduce((s, x) => s + x.value, 0);
    return [...top, { name: "기타", value: restSum }];
  }, [answers]);

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
            className={`flex items-center gap-2 bg-card border border-white/60 rounded-full p-1.5 pl-4 shadow-pink ${
              !canSubmit ? "opacity-60" : ""
            }`}
          >
            {canSubmit ? (
              <Megaphone className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <input
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
              maxLength={24}
              className="flex-1 bg-transparent outline-none text-sm py-1.5 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!text.trim() || !canSubmit}
              className="bounce-press bg-grad-strawberry text-white rounded-full p-2 shadow-pink disabled:opacity-40 disabled:hover:scale-100"
              aria-label="응답 보내기"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {total === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">
            아직 도착한 응답이 없어요 🍒
          </div>
        ) : (
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="78%"
                  innerRadius="42%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                  label={(entry: { name: string; value: number }) =>
                    `${entry.name} ${entry.value}`
                  }
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}개 (${Math.round((value / total) * 100)}%)`,
                    name,
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
