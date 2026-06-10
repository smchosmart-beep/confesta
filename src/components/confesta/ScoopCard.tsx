import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import scoopMask from "@/assets/scoop-mask.png.asset.json";

type Flavor = "strawberry" | "blueberry" | "mint" | "mango";

const FLAVOR_GRAD: Record<Flavor, string> = {
  strawberry: "bg-grad-strawberry",
  blueberry: "bg-grad-blueberry",
  mint: "bg-grad-mint",
  mango: "bg-grad-mango",
};

const FLAVOR_SHADOW: Record<Flavor, string> = {
  strawberry:
    "drop-shadow(0 6px 10px rgba(255,0,122,0.22)) drop-shadow(0 22px 36px rgba(255,0,122,0.30))",
  blueberry:
    "drop-shadow(0 6px 10px rgba(75,83,224,0.22)) drop-shadow(0 22px 36px rgba(75,83,224,0.30))",
  mint:
    "drop-shadow(0 6px 10px rgba(47,185,154,0.22)) drop-shadow(0 22px 36px rgba(47,185,154,0.30))",
  mango:
    "drop-shadow(0 6px 10px rgba(255,138,31,0.22)) drop-shadow(0 22px 36px rgba(255,138,31,0.30))",
};


const MASK_STYLE: React.CSSProperties = {
  WebkitMaskImage: `url(${scoopMask.url})`,
  maskImage: `url(${scoopMask.url})`,
  WebkitMaskSize: "contain",
  maskSize: "contain",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
};

interface Props {
  to: "/audience" | "/presenter" | "/staff" | "/admin";
  flavor: Flavor;
  label: string;
  ko: string;
  desc: string;
  icon: LucideIcon;
}

export function ScoopCard({ to, flavor, label, ko, desc, icon: Icon }: Props) {
  return (
    <Link
      to={to}
      aria-label={`${ko} 역할로 이동`}
      className="group bounce-press relative block w-full max-w-[340px] mx-auto"
      style={{ filter: FLAVOR_SHADOW[flavor] }}
    >
      <div className="relative aspect-square w-full" style={MASK_STYLE}>
        {/* base flavor gradient */}
        <div className={`absolute inset-0 ${FLAVOR_GRAD[flavor]}`} />

        {/* hemisphere volume shading — gradient fades naturally, no hard cut */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 35% 22%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0) 55%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)",
          }}
        />

        {/* specular highlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle 70px at 28% 22%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        {/* body↔skirt separation — precise U-shaped curve via SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* dark curved shadow band */}
          <path
            d="M 5,55 Q 50,82 95,55"
            stroke="rgba(0,0,0,0.32)"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            style={{ filter: "blur(2px)" }}
          />
          {/* thin bright rim just below the curve */}
          <path
            d="M 5,58 Q 50,85 95,58"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            style={{ filter: "blur(0.6px)" }}
          />
        </svg>


        {/* skirt shading — overall tone-down below the curve */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 70%, rgba(0,0,0,0.10) 82%, rgba(0,0,0,0.22) 100%)",
          }}
        />


        {/* edge vignette → rim shading */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)",
          }}
        />

        {/* topping decor */}
        <div className="absolute inset-0 opacity-90">
          <ToppingScatter density="med" seed={`scoop-${to}`} />
        </div>


        {/* content — sits inside the round body, above the melted skirt */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pt-5"
          style={{ paddingBottom: "32%" }}
        >
          <span className="w-14 h-14 rounded-full bg-white/85 ring-2 ring-white shadow-cream flex items-center justify-center mb-3">
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
