import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import truckStrawberry from "@/assets/truck-strawberry.png.asset.json";
import truckBlueberry from "@/assets/truck-blueberry.png.asset.json";
import truckMint from "@/assets/truck-mint.png.asset.json";
import truckMango from "@/assets/truck-mango.png.asset.json";

type Flavor = "strawberry" | "blueberry" | "mint" | "mango";

const TRUCK_SRC: Record<Flavor, string> = {
  strawberry: truckStrawberry.url,
  blueberry: truckBlueberry.url,
  mint: truckMint.url,
  mango: truckMango.url,
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

const TEXT_HALO: React.CSSProperties = {
  textShadow:
    "0 1px 2px rgba(255,255,255,0.85), 0 0 6px rgba(255,255,255,0.7)",
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

export function TruckCard({ to, flavor, label, ko, desc, icon: Icon, device }: Props) {
  return (
    <Link
      to={to}
      aria-label={`${ko} 역할로 이동`}
      className="group bounce-press relative block w-full max-w-[340px] mx-auto"
    >
      <div
        className="relative aspect-square w-full transition-transform duration-300 group-hover:-translate-y-1"
        style={{ filter: FLAVOR_SHADOW[flavor] }}
      >
        <img
          src={TRUCK_SRC[flavor]}
          alt=""
          width={1024}
          height={1024}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />

        {/* 텍스트 오버레이: 트럭 몸체 하단 단색 영역 */}
        <div
          className="absolute inset-x-0 flex flex-col items-center text-center px-6"
          style={{ top: "50%" }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: FLAVOR_TEXT[flavor], ...TEXT_HALO }}
          >
            {label}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Icon
              className="w-5 h-5"
              style={{
                color: FLAVOR_TEXT[flavor],
                filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.9))",
              }}
            />
            <h2
              className="text-xl font-extrabold leading-none"
              style={{ color: FLAVOR_TEXT[flavor], ...TEXT_HALO }}
            >
              {ko}
            </h2>
          </div>
          <p
            className="text-[11px] sm:text-xs mt-1 max-w-[22ch] leading-snug font-semibold whitespace-pre-line"
            style={{ color: FLAVOR_TEXT[flavor], ...TEXT_HALO }}
          >
            {desc}
          </p>
          {device && (
            <span
              className="mt-1.5 inline-flex items-center gap-1 bg-white/95 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-cream"
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
