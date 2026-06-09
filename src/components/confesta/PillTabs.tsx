interface Tab<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface Props<T extends string> {
  tabs: Tab<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}

export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  size = "md",
}: Props<T>) {
  return (
    <div className="inline-flex max-w-full p-1 sm:p-1.5 bg-card/80 backdrop-blur rounded-full shadow-cream border border-white/60">
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`bounce-press inline-flex items-center gap-1 sm:gap-1.5 rounded-full font-semibold whitespace-nowrap ${
              size === "sm"
                ? "px-2.5 py-1 text-[11px] sm:px-3.5 sm:py-1.5 sm:text-xs"
                : "px-2.5 py-1.5 text-[11px] sm:px-5 sm:py-2 sm:text-sm"
            } ${
              active
                ? "bg-grad-strawberry text-white shadow-pink"
                : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
