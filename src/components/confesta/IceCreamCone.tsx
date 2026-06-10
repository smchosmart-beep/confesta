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
  const domeVisible = domeBox * 0.36; // overlap step — smaller = deeper overlap
  const coneW = w * 0.78;
  const coneH = coneW * 0.95;
  const coneTuck = coneH * 0.12;

  const placeholderCount = scoops.length === 0 ? 3 : 0;
  const count = Math.max(scoops.length + placeholderCount, 1);
  const totalHeight =
    domeVisible * count + (coneH - coneTuck) + domeBox * 0.04;

  const CONE_CLIP = "polygon(0% 6%, 100% 6%, 50% 100%)";

  return (
    <div
      className="relative mx-auto"
      style={{ width: w, height: totalHeight }}
    >
      {/* Cone (back layer) — pure CSS, no SVG defs */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          width: coneW,
          height: coneH,
          bottom: 0,
          zIndex: 5,
          filter: "drop-shadow(0 6px 10px rgba(110,68,22,0.25))",
        }}
        aria-hidden
      >
        {/* cone body */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: CONE_CLIP,
            WebkitClipPath: CONE_CLIP,
            background:
              "linear-gradient(180deg, #EBC18A 0%, #B07B3F 60%, #6E4416 100%)",
          }}
        />
        {/* waffle pattern */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: CONE_CLIP,
            WebkitClipPath: CONE_CLIP,
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 6px, rgba(0,0,0,0.20) 6px 7px), repeating-linear-gradient(-45deg, transparent 0 6px, rgba(0,0,0,0.20) 6px 7px)",
          }}
        />
        {/* rim */}
        <div
          className="absolute left-0 right-0"
          style={{
            top: 0,
            height: coneH * 0.08,
            background:
              "linear-gradient(180deg, #F4D9A8 0%, #B07B3F 100%)",
            borderRadius: 6,
          }}
        />
      </div>

      {/* Empty state — 3 ghost scoops on the cone (matches receipt design) */}
      {scoops.length === 0 &&
        Array.from({ length: 3 }).map((_, i) => {
          const bottom = coneH - coneTuck - domeBox * 0.5 + i * domeVisible;
          const isTop = i === 2;
          return (
            <div
              key={`ghost-${i}`}
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                width: domeBox,
                height: domeBox,
                bottom,
                zIndex: 10 + i,
              }}
              aria-hidden
            >
              <div className="absolute inset-0" style={MASK_STYLE}>
                <div className="absolute inset-0 bg-white/70" />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "repeating-linear-gradient(45deg, transparent 0 5px, rgba(0,0,0,0.10) 5px 6px)",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,0.10) 100%)",
                  }}
                />
                {isTop && (
                  <div className="absolute inset-x-0 top-[18%] text-center text-[10px] font-bold text-muted-foreground tracking-wide">
                    QR 스캔하면 스쿱이 쌓여요
                  </div>
                )}
              </div>
            </div>
          );
        })}


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
