import type { StackedScoop } from "@/lib/confesta/types";
import scoopMask from "@/assets/scoop-mask.png.asset.json";
import { ToppingScatter } from "./ToppingDecor";

type Flavor = "mint" | "strawberry" | "mango" | "blueberry" | "chocolate";

const FLAVOR_GRAD: Record<Flavor, string> = {
  strawberry: "bg-grad-strawberry",
  blueberry: "bg-grad-blueberry",
  mint: "bg-grad-mint",
  mango: "bg-grad-mango",
  chocolate: "bg-grad-mango",
};

const FLAVOR_SHADOW: Record<Flavor, string> = {
  strawberry: "drop-shadow(0 4px 8px rgba(255,0,122,0.28))",
  blueberry: "drop-shadow(0 4px 8px rgba(75,83,224,0.28))",
  mint: "drop-shadow(0 4px 8px rgba(47,185,154,0.28))",
  mango: "drop-shadow(0 4px 8px rgba(255,138,31,0.28))",
  chocolate: "drop-shadow(0 4px 8px rgba(110,68,22,0.28))",
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
  scoops: StackedScoop[];
  size?: number;
}

export function IceCreamCone({ scoops, size = 200 }: Props) {
  const w = size;
  const domeW = w * 0.82;
  const overlap = 0.52; // each scoop overlaps previous by this fraction of its square
  const stackHeight =
    scoops.length > 0
      ? domeW * (1 - overlap) * scoops.length + domeW * overlap
      : domeW * 0.5;
  const h = stackHeight + w * 0.78 - domeW * 0.18; // + cone height, slight overlap

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ width: w, height: h }}
    >
      {/* Scoop stack */}
      <div
        className="relative flex flex-col-reverse items-center"
        style={{ width: domeW }}
      >
        {scoops.map((scoop, i) => {
          const flavor = (scoop.flavor as Flavor) ?? "mint";
          return (
            <div
              key={scoop.id}
              className="relative"
              style={{
                width: domeW,
                height: domeW,
                marginTop: i === 0 ? 0 : -domeW * overlap,
                zIndex: i + 1,
                filter: FLAVOR_SHADOW[flavor],
                animation: "var(--animate-scoop-drop)",
                animationDelay: `${i * 40}ms`,
              }}
              aria-label={`${flavor} 스쿱`}
            >
              <div className="absolute inset-0" style={MASK_STYLE}>
                <div className={`absolute inset-0 ${FLAVOR_GRAD[flavor]}`} />
                {/* volume shading */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 70% 55% at 35% 22%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0) 55%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)",
                  }}
                />
                {/* specular */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle 40px at 28% 22%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%)",
                  }}
                />
                {/* bottom inner shadow */}
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
                {/* rim vignette */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)",
                  }}
                />
                {/* toppings */}
                <div className="absolute inset-0 opacity-90">
                  <ToppingScatter density="low" seed={`cone-${scoop.id}`} />
                </div>
              </div>
            </div>
          );
        })}

        {scoops.length === 0 && (
          <div
            className="rounded-full border-2 border-dashed border-foreground/15 flex items-center justify-center text-xs text-muted-foreground"
            style={{ width: domeW, height: domeW * 0.48 }}
          >
            QR 스캔하면 스쿱이 쌓여요
          </div>
        )}
      </div>

      {/* Cone */}
      <svg
        viewBox="0 0 100 100"
        style={{
          width: w * 0.78,
          height: w * 0.78,
          marginTop: -domeW * 0.18,
          zIndex: 0,
        }}
        aria-hidden
      >
        <defs>
          <linearGradient id="cone-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#EBC18A" />
            <stop offset="60%" stopColor="#B07B3F" />
            <stop offset="100%" stopColor="#6E4416" />
          </linearGradient>
          <linearGradient id="cone-rim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F4D9A8" />
            <stop offset="100%" stopColor="#B07B3F" />
          </linearGradient>
          <pattern
            id="waffle"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
            patternTransform="rotate(45)"
          >
            <path
              d="M0 0 L10 0 M0 5 L10 5"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth="0.6"
              fill="none"
            />
            <path
              d="M0 0 L0 10 M5 0 L5 10"
              stroke="rgba(0,0,0,0.18)"
              strokeWidth="0.6"
              fill="none"
            />
          </pattern>
        </defs>
        <polygon points="10,5 90,5 50,95" fill="url(#cone-grad)" />
        <polygon points="10,5 90,5 50,95" fill="url(#waffle)" />
        <rect x="8" y="2" width="84" height="8" rx="3" fill="url(#cone-rim)" />
      </svg>
    </div>
  );
}
