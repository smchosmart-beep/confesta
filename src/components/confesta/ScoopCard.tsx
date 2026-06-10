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
  device?: "mobile" | "desktop";
}

export function ScoopCard({ to, flavor, label, ko, desc, icon: Icon, device }: Props) {
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

        {/* dome bottom inner shadow — aligned with mask cut curve */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M 3,52 Q 50,79 97,52"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            style={{ filter: "blur(4px)" }}
          />

        </svg>

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
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pt-4"
          style={{ paddingBottom: "42%" }}
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
          {device && (
            <span className="mt-2 inline-flex items-center gap-1 bg-white/90 text-foreground/80 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-cream">
              {device === "mobile" ? "📱 모바일 전용" : "🖥 데스크톱 권장"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
