import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Megaphone, Lock } from "lucide-react";

const PALETTE = [
  "var(--scoop-strawberry)",
  "var(--scoop-mango)",
  "var(--scoop-mint)",
  "var(--scoop-blueberry)",
  "var(--scoop-grape)",
  "var(--scoop-chocolate)",
  "var(--muted-foreground)",
];

const SAMPLE_PROMPT = "오늘 가장 인상 깊었던 단어 하나는?";
const SAMPLE_ANSWERS: { name: string; value: number }[] = [
  { name: "배수판별법", value: 7 },
  { name: "생성형ai", value: 5 },
  { name: "프롬프트", value: 3 },
  { name: "탐구", value: 2 },
  { name: "수학적사고", value: 2 },
  { name: "협력", value: 1 },
];

export function SampleAnswerPromptCard() {
  const total = useMemo(
    () => SAMPLE_ANSWERS.reduce((s, x) => s + x.value, 0),
    [],
  );

  return (
    <div className="relative overflow-hidden bg-card rounded-3xl p-5 shadow-cream border border-dashed border-grad-mango/40 opacity-95">
      <div className="absolute inset-0 bg-grad-sunset-soft opacity-40" />
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-grad-mango/20 text-grad-mango text-[10px] font-extrabold tracking-wide z-10">
        SAMPLE
      </div>
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <Megaphone className="w-4 h-4 shrink-0 mt-0.5 text-pink-700" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-grad-strawberry text-white shadow-pink">
                진행 중
              </span>
              <span className="text-[11px] font-mono text-muted-foreground">
                응답 {total}
              </span>
            </div>
            <h4 className="mt-1 text-sm font-bold text-foreground break-keep">
              {SAMPLE_PROMPT}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-card border border-white/60 rounded-full p-1.5 pl-4 shadow-pink opacity-70">
          <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-sm text-muted-foreground py-1.5">
            예시 미리보기 — 실제 질문이 열리면 여기에 입력해요
          </span>
        </div>

        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={SAMPLE_ANSWERS}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="78%"
                innerRadius="42%"
                paddingAngle={2}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
                label={(entry: { name: string; value: number }) =>
                  `${entry.name} ${entry.value}`
                }
              >
                {SAMPLE_ANSWERS.map((_, i) => (
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
      </div>
    </div>
  );
}
