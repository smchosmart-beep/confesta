import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useSessionToppings } from "@/hooks/use-toppings";

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
  sessionId: string;
  promptId: string | null;
}

export function AnswerPie({ sessionId, promptId }: Props) {
  const { toppings } = useSessionToppings(sessionId);

  const answers = useMemo(
    () =>
      toppings.filter(
        (t) => t.kind === "answer" && promptId != null && t.promptId === promptId,
      ),
    [toppings, promptId],
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

  if (promptId == null) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        통계를 볼 응답 질문을 선택하세요
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        아직 도착한 응답이 없어요 🍒
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 24, right: 24, bottom: 32, left: 24 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            outerRadius="62%"
            innerRadius="34%"
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
            wrapperStyle={{ fontSize: 11, paddingTop: 16 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
