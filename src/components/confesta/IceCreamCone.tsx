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
  const domeBox = w * 0.86; // square that contains a single dome scoop
  const domeVisible = domeBox * 0.5; // visible dome height inside the square
  const coneW = w * 0.78;
  const coneH = coneW; // svg is square viewBox
  const coneTuck = coneW * 0.1; // how much scoops sit into the cone rim

  const count = Math.max(scoops.length, 1);
  const totalHeight =
    domeVisible * count + (coneH - coneTuck) + domeBox * 0.04; // breathing room

  return (
    <div
      className="relative mx-auto"
      style={{ width: w, height: totalHeight }}
    >
      {/* Cone (back layer) */}
      <svg
        viewBox="0 0 100 100"
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          width: coneW,
          height: coneH,
          bottom: 0,
          zIndex: 5,
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

      {/* Empty state */}
      {scoops.length === 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-dashed border-foreground/15 flex items-center justify-center text-xs text-muted-foreground bg-white/60"
          style={{
            width: domeBox * 0.9,
            height: domeVisible,
            bottom: coneH - coneTuck,
          }}
        >
          QR 스캔하면 스쿱이 쌓여요
        </div>
      )}

      {/* Scoops (i=0 is bottom) */}
      {scoops.map((scoop, i) => {
        const flavor = (scoop.flavor as Flavor) ?? "mint";
        // bottom of each scoop's square box; scoop dome occupies the top half of the box.
        // The box's flat bottom curve sits at ~52% from top → visible bottom is at boxBottom + domeBox*0.48.
        // We want successive scoops to sit so that their visible bottom curve overlaps cleanly.
        const bottom =
          coneH - coneTuck - domeBox * 0.5 + i * domeVisible;
        return (
          <div
            key={scoop.id}
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: domeBox,
              height: domeBox,
              bottom,
              zIndex: 10 + i,
              filter: FLAVOR_SHADOW[flavor],
              animation: "var(--animate-scoop-drop)",
              animationDelay: `${i * 40}ms`,
            }}
            aria-label={`${flavor} 스쿱`}
          >
            <div className="absolute inset-0" style={MASK_STYLE}>
              <div className={`absolute inset-0 ${FLAVOR_GRAD[flavor]}`} />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 55% at 35% 22%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0) 55%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle 40px at 28% 22%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%)",
                }}
              />
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
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.18) 100%)",
                }}
              />
              <div className="absolute inset-0 opacity-90">
                <ToppingScatter density="low" seed={`cone-${scoop.id}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
