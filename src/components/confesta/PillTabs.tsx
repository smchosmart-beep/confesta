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
    <div className="inline-flex p-1.5 bg-muted rounded-full shadow-cream">
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`bounce-press inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
              size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm"
            } ${
              active
                ? "bg-primary text-primary-foreground shadow-pink"
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
