import type { StackedScoop } from "@/lib/confesta/types";

const FLAVOR_VAR: Record<string, string> = {
  mint: "var(--scoop-mint)",
  strawberry: "var(--scoop-strawberry)",
  mango: "var(--scoop-mango)",
  blueberry: "var(--scoop-blueberry)",
  chocolate: "var(--scoop-chocolate)",
};

interface Props {
  scoops: StackedScoop[];
  size?: number;
}

export function IceCreamCone({ scoops, size = 200 }: Props) {
  const w = size;
  const h = size * 1.6;
  return (
    <div
      className="relative flex flex-col items-center justify-end"
      style={{ width: w, height: h }}
    >
      <div
        className="absolute flex flex-col-reverse items-center"
        style={{ bottom: h * 0.42, width: w * 0.82 }}
      >
        {scoops.map((scoop, i) => (
          <div
            key={scoop.id}
            className="rounded-full -mb-3 border-2 border-white/70 shadow-cream"
            style={{
              width: w * 0.78,
              height: w * 0.48,
              backgroundColor: FLAVOR_VAR[scoop.flavor],
              zIndex: i + 1,
              animation: "var(--animate-scoop-drop)",
              animationDelay: `${i * 30}ms`,
            }}
            aria-label={`${scoop.flavor} 스쿱`}
          />
        ))}
        {scoops.length === 0 && (
          <div
            className="rounded-full border-2 border-dashed border-foreground/15 flex items-center justify-center text-xs text-muted-foreground"
            style={{ width: w * 0.78, height: w * 0.48 }}
          >
            QR 스캔하면 스쿱이 쌓여요
          </div>
        )}
      </div>

      {/* Cone */}
      <svg
        viewBox="0 0 100 100"
        style={{ width: w * 0.78, height: w * 0.78 }}
        aria-hidden
      >
        <defs>
          <pattern id="waffle" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
            <path d="M0 0 L10 0 M0 5 L10 5" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" fill="none" />
            <path d="M0 0 L0 10 M5 0 L5 10" stroke="rgba(0,0,0,0.18)" strokeWidth="0.6" fill="none" />
          </pattern>
        </defs>
        <polygon points="10,5 90,5 50,95" fill="var(--cone)" />
        <polygon points="10,5 90,5 50,95" fill="url(#waffle)" />
        <rect x="8" y="2" width="84" height="8" rx="3" fill="var(--cone)" />
      </svg>
    </div>
  );
}
