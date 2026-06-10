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

const FLAVOR_TEXT: Record<Flavor, string> = {
  strawberry: "#5A0030",
  blueberry: "#1A1E6B",
  mint: "#0A4438",
  mango: "#6B3300",
};

// 강한 텍스트 외곽선(흰색 헤일로) — 어떤 하이라이트 위에서도 윤곽 확보
const TEXT_HALO: React.CSSProperties = {
  textShadow:
    "0 1px 0 rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.5)",
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

          <div
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: FLAVOR_TEXT[flavor], ...TEXT_HALO }}
          >
            {label}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <Icon
              className="w-6 h-6"
              style={{ color: FLAVOR_TEXT[flavor], filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.8))" }}
            />
            <h2
              className="text-2xl font-extrabold"
              style={{ color: FLAVOR_TEXT[flavor], ...TEXT_HALO }}
            >
              {ko}
            </h2>
          </div>
          <p
            className="text-xs sm:text-sm mt-1.5 max-w-[18ch] leading-snug font-semibold"
            style={{ color: FLAVOR_TEXT[flavor], ...TEXT_HALO }}
          >
            {desc}
          </p>
          {device && (
            <span
              className="mt-2 inline-flex items-center gap-1 bg-white/95 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-cream"
              style={{ color: FLAVOR_TEXT[flavor] }}
            >
              {device === "mobile" ? "📱 모바일 전용" : "🖥 데스크톱 권장"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
