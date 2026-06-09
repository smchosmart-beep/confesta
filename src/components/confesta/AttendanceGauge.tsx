interface Props {
  count: number;
  capacity: number;
  size?: number;
}

export function AttendanceGauge({ count, capacity, size = 160 }: Props) {
  const ratio = Math.min(1, capacity > 0 ? count / capacity : 0);
  const stroke = Math.max(10, size * 0.08);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#gauge-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-extrabold tabular-nums leading-none"
          style={{ fontSize: size * 0.28 }}
        >
          {count}
        </span>
        <span className="text-xs text-muted-foreground mt-1">
          / {capacity}명
        </span>
      </div>
    </div>
  );
}
