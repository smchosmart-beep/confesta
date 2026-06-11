import { useMemo } from "react";

/* ===== Individual SVG toppings ===== */

interface IconProps {
  size?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Sprinkle({ size = 16, rotate = 0, color, className, style }: IconProps & { color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      className={className}
      aria-hidden
    >
      <rect
        x="6.5"
        y="1.5"
        width="3"
        height="13"
        rx="1.5"
        fill={color ?? "#FF7AB6"}
      />
    </svg>
  );
}

export function Cherry({ size = 22, rotate = 0, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="cherry-g" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#FFA9C2" />
          <stop offset="60%" stopColor="#FF3F77" />
          <stop offset="100%" stopColor="#B5002F" />
        </radialGradient>
        <linearGradient id="cherry-stem" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7CB342" />
          <stop offset="100%" stopColor="#33691E" />
        </linearGradient>
      </defs>
      <path
        d="M16 4 C14 8 10 10 8 14"
        stroke="url(#cherry-stem)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="11" cy="22" r="8" fill="url(#cherry-g)" />
      <circle cx="9" cy="20" r="2" fill="#FFD6E1" opacity="0.7" />
    </svg>
  );
}

export function ChocChip({ size = 18, rotate = 0, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size * 0.82}
      viewBox="0 0 24 20"
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="choc-g" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#C68A52" />
          <stop offset="55%" stopColor="#7A4520" />
          <stop offset="100%" stopColor="#2E1606" />
        </radialGradient>
      </defs>
      {/* Rounded chocolate disc (button shape) */}
      <ellipse cx="12" cy="11" rx="10" ry="8" fill="url(#choc-g)" />
      {/* Glossy highlight */}
      <ellipse
        cx="9"
        cy="7"
        rx="4.5"
        ry="2.2"
        fill="#FFE6C2"
        opacity="0.45"
      />
      {/* Subtle rim shadow */}
      <ellipse
        cx="12"
        cy="14"
        rx="9"
        ry="5.5"
        fill="none"
        stroke="rgba(20,8,2,0.35)"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export function StarSprinkle({ size = 16, rotate = 0, color, className, style }: IconProps & { color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      className={className}
      aria-hidden
    >
      <path
        d="M12 2 L14.4 9 L22 9 L15.8 13.4 L18 21 L12 16.6 L6 21 L8.2 13.4 L2 9 L9.6 9 Z"
        fill={color ?? "#FFD27F"}
      />
    </svg>
  );
}

export function Heart({ size = 16, rotate = 0, color, className, style }: IconProps & { color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      className={className}
      aria-hidden
    >
      <path
        d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"
        fill={color ?? "#FF7AB6"}
      />
    </svg>
  );
}

export function Wafer({ size = 22, rotate = 0, className, style }: IconProps) {
  return (
    <svg
      width={size * 0.5}
      height={size}
      viewBox="0 0 12 24"
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="wafer-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F4D9A8" />
          <stop offset="100%" stopColor="#B07B3F" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="10" height="22" rx="2" fill="url(#wafer-g)" />
      <line x1="1" y1="7" x2="11" y2="7" stroke="#7A5023" strokeWidth="0.7" opacity="0.4" />
      <line x1="1" y1="13" x2="11" y2="13" stroke="#7A5023" strokeWidth="0.7" opacity="0.4" />
      <line x1="1" y1="19" x2="11" y2="19" stroke="#7A5023" strokeWidth="0.7" opacity="0.4" />
    </svg>
  );
}

/* ===== Scatter container ===== */

const SPRINKLE_COLORS = ["#FF7AB6", "#FFD27F", "#6B73FF", "#5BD1B8", "#FF4D9D"];
const STAR_COLORS = ["#FFD27F", "#FFA9C2", "#8A91FF"];

type DecorType = "sprinkle" | "star" | "cherry" | "choc" | "heart" | "wafer";

interface ScatterProps {
  /** Number of toppings to render. */
  density?: "low" | "med" | "high";
  /** Deterministic seed so positions are stable across re-renders. */
  seed?: string;
  /** Allow toppings to overflow the parent. Default clips with overflow:hidden. */
  bleed?: boolean;
  /** Animate floating motion. */
  animated?: boolean;
  /** Restrict types used. */
  types?: DecorType[];
  className?: string;
}

// Tiny seeded PRNG (mulberry32)
function makeRng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COUNT: Record<NonNullable<ScatterProps["density"]>, number> = {
  low: 6,
  med: 12,
  high: 22,
};

export function ToppingScatter({
  density = "low",
  seed = "default",
  bleed = false,
  animated = true,
  types = ["sprinkle", "star", "cherry", "choc", "heart"],
  className,
}: ScatterProps) {
  const items = useMemo(() => {
    const rng = makeRng(seed + density);
    const n = COUNT[density];
    return Array.from({ length: n }, (_, i) => {
      const type = types[Math.floor(rng() * types.length)];
      return {
        i,
        type,
        top: rng() * 100,
        left: rng() * 100,
        size: 10 + rng() * 22,
        rotate: rng() * 360,
        delay: rng() * 4,
        duration: 4 + rng() * 5,
        color:
          type === "star"
            ? STAR_COLORS[Math.floor(rng() * STAR_COLORS.length)]
            : SPRINKLE_COLORS[Math.floor(rng() * SPRINKLE_COLORS.length)],
        opacity: 0.45 + rng() * 0.45,
      };
    });
  }, [seed, density, types]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${
        bleed ? "" : "overflow-hidden"
      } ${className ?? ""}`}
    >
      {items.map((it) => {
        const style: React.CSSProperties = {
          position: "absolute",
          top: `${it.top}%`,
          left: `${it.left}%`,
          opacity: it.opacity,
          ["--rot" as string]: `${it.rotate}deg`,
          animationDelay: `${it.delay}s`,
          animationDuration: `${it.duration}s`,
        };
        const cls = animated ? "float-topping" : "";
        const common = { className: cls, style, size: it.size, rotate: it.rotate };
        switch (it.type) {
          case "sprinkle":
            return <Sprinkle key={it.i} {...common} color={it.color} />;
          case "star":
            return <StarSprinkle key={it.i} {...common} color={it.color} />;
          case "cherry":
            return <Cherry key={it.i} {...common} />;
          case "choc":
            return <ChocChip key={it.i} {...common} />;
          case "heart":
            return <Heart key={it.i} {...common} color={it.color} />;
          case "wafer":
            return <Wafer key={it.i} {...common} />;
        }
      })}
    </div>
  );
}
