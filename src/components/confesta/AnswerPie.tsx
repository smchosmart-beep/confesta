import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useSessionAnswerTexts } from "@/hooks/use-answer-texts";
import { extractKeywords } from "@/lib/confesta/keywords";

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
  const { items } = useSessionAnswerTexts(sessionId);

  const answers = useMemo(
    () => items.filter((t) => promptId != null && t.promptId === promptId),
    [items, promptId],
  );
  const sorted = useMemo(() => {
    const kws = extractKeywords(answers.map((a) => a.text));
    return kws.map((k) => ({ name: k.word, value: k.count }));
  }, [answers]);

  const total = sorted.reduce((s, x) => s + x.value, 0);

  const data = useMemo(() => {
    const TOP = 6;
    if (sorted.length <= TOP) return sorted;
    const top = sorted.slice(0, TOP);
    const restSum = sorted.slice(TOP).reduce((s, x) => s + x.value, 0);
    return [...top, { name: "기타", value: restSum }];
  }, [sorted]);

  if (promptId == null) {
    return (
      <div className="h-full flex justify-center pt-10 text-sm text-muted-foreground">
        통계를 볼 응답 질문을 선택하세요
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="h-full flex justify-center pt-10 text-sm text-muted-foreground">
        아직 도착한 응답이 없어요 🍒
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-stretch">
      <div className="w-full flex-1 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="65%"
              innerRadius="38%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              labelLine={false}
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
              wrapperStyle={{ fontSize: 13, paddingTop: 4 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
