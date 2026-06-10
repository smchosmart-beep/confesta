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
        {/* top glossy highlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 32% 18%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 60%)",
          }}
        />
        {/* specular highlight */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle 60px at 28% 20%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        {/* bottom inner shadow → spherical volume */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 98%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0) 55%)",
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
        {/* skirt separation band */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.12) 72%, transparent 82%)",
          }}
        />
        {/* topping decor */}
        <div className="absolute inset-0 opacity-90">
          <ToppingScatter density="med" seed={`scoop-${to}`} />
        </div>


        {/* content — sits inside the round body, above the melted skirt */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pt-5"
          style={{ paddingBottom: "26%" }}
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
