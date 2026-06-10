import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";

type Flavor = "strawberry" | "blueberry" | "mint" | "mango";

const FLAVOR_GRAD: Record<Flavor, string> = {
  strawberry: "bg-grad-strawberry",
  blueberry: "bg-grad-blueberry",
  mint: "bg-grad-mint",
  mango: "bg-grad-mango",
};

const FLAVOR_SHADOW: Record<Flavor, string> = {
  strawberry: "drop-shadow(0 14px 26px rgba(255, 0, 122, 0.28))",
  blueberry: "drop-shadow(0 14px 26px rgba(75, 83, 224, 0.28))",
  mint: "drop-shadow(0 14px 26px rgba(47, 185, 154, 0.28))",
  mango: "drop-shadow(0 14px 26px rgba(255, 138, 31, 0.28))",
};

// objectBoundingBox path: top is a smooth dome, bottom is a wavy scoop edge.
const SCOOP_PATH =
  "M 0,0.42 C 0,0.02 1,0.02 1,0.42 L 1,0.66 " +
  "Q 0.93,0.95 0.83,0.74 " +
  "Q 0.72,0.55 0.61,0.82 " +
  "Q 0.50,1.00 0.39,0.78 " +
  "Q 0.28,0.55 0.17,0.80 " +
  "Q 0.07,0.97 0,0.66 Z";

let CLIP_ID_COUNTER = 0;

interface Props {
  to: "/audience" | "/presenter" | "/staff" | "/admin";
  flavor: Flavor;
  label: string;
  ko: string;
  desc: string;
  icon: LucideIcon;
}

export function ScoopCard({ to, flavor, label, ko, desc, icon: Icon }: Props) {
  const clipId = `scoop-clip-${++CLIP_ID_COUNTER}`;
  return (
    <Link
      to={to}
      aria-label={`${ko} 역할로 이동`}
      className="group bounce-press relative block"
      style={{ filter: FLAVOR_SHADOW[flavor] }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={SCOOP_PATH} />
          </clipPath>
        </defs>
      </svg>

      <div
        className="relative aspect-[4/3] w-full"
        style={{ clipPath: `url(#${clipId})`, WebkitClipPath: `url(#${clipId})` } as React.CSSProperties}
      >
        {/* base flavor gradient */}
        <div className={`absolute inset-0 ${FLAVOR_GRAD[flavor]}`} />
        {/* soft highlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)",
          }}
        />
        {/* topping decor */}
        <div className="absolute inset-0 opacity-90">
          <ToppingScatter density="med" seed={`scoop-${to}`} />
        </div>

        {/* content — keep inside the dome */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pt-6 pb-16">
          <span className="w-14 h-14 rounded-full bg-white/80 ring-2 ring-white shadow-cream flex items-center justify-center mb-3">
            <Icon className="w-7 h-7 text-foreground/80" />
          </span>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/90 drop-shadow-sm">
            {label}
          </div>
          <h2 className="text-2xl font-extrabold text-white drop-shadow mt-0.5">
            {ko}
          </h2>
          <p className="text-xs sm:text-sm text-white/95 mt-1.5 max-w-[18ch] leading-snug drop-shadow-sm">
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}
