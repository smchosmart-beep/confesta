import { useId } from "react";
import type { StackedScoop } from "@/lib/confesta/types";
import scoopMask from "@/assets/scoop-mask.png.asset.json";


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
  /** Number of toppings to render on top scoop. Clamped 0-3. */
  toppingCount?: number;
}

export function IceCreamCone({ scoops, size = 200, toppingCount = 0 }: Props) {
  const uid = useId().replace(/:/g, "");
  const gBody = `coneBody-${uid}`;
  const gSide = `coneSide-${uid}`;
  const gTip = `coneTip-${uid}`;
  const gCell = `cellFace-${uid}`;
  const gGrid = `waffleGrid-${uid}`;
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

  const tc = Math.max(0, Math.min(3, Math.floor(toppingCount)));
  const topScoopIndex = scoops.length - 1;
  const topScoopBottom =
    coneH - coneTuck - domeBox * 0.5 + topScoopIndex * domeVisible;




  return (
    <div
      className="relative mx-auto"
      style={{ width: w, height: totalHeight }}
    >
      {/* Cone (back layer) — SVG with embossed waffle lattice */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          width: coneW,
          height: coneH,
          bottom: 0,
          zIndex: 5,
          filter: "drop-shadow(0 8px 12px rgba(74,42,14,0.32))",
        }}
        aria-hidden
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id={gBody} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F4D9A8" />
              <stop offset="35%" stopColor="#D9A86A" />
              <stop offset="75%" stopColor="#8E5A24" />
              <stop offset="100%" stopColor="#4A2A0E" />
            </linearGradient>
            <linearGradient id={gSide} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4A2A0E" stopOpacity="0.35" />
              <stop offset="22%" stopColor="#FFFFFF" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="78%" stopColor="#4A2A0E" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#4A2A0E" stopOpacity="0.45" />
            </linearGradient>
            <radialGradient id={gTip} cx="0.5" cy="1" r="0.6">
              <stop offset="0%" stopColor="#2A1607" stopOpacity="0.7" />
              <stop offset="45%" stopColor="#4A2A0E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4A2A0E" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={gCell} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F0CB8E" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#B7873E" stopOpacity="0" />
              <stop offset="100%" stopColor="#2A1607" stopOpacity="0.55" />
            </linearGradient>
            <pattern
              id={gGrid}
              width="11"
              height="11"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 5.5 0.5 L 10.5 5.5 L 5.5 10.5 L 0.5 5.5 Z"
                fill={`url(#${gCell})`}
              />
              <path
                d="M 5.5 1.2 L 9.8 5.5"
                stroke="rgba(255,235,200,0.55)"
                strokeWidth="0.45"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 5.5 1.2 L 1.2 5.5"
                stroke="rgba(255,235,200,0.35)"
                strokeWidth="0.35"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 9.8 5.5 L 5.5 9.8 L 1.2 5.5"
                stroke="rgba(42,22,7,0.55)"
                strokeWidth="0.5"
                fill="none"
                strokeLinejoin="miter"
              />
              <path
                d="M 5.5 0.5 L 10.5 5.5 L 5.5 10.5 L 0.5 5.5 Z"
                fill="none"
                stroke="rgba(42,22,7,0.7)"
                strokeWidth="0.35"
              />
            </pattern>
          </defs>

          {/* Stacked triangle fills (no clipPath — preserveAspectRatio=none breaks clipPath rendering) */}
          <polygon points="0,6 100,6 50,100" fill={`url(#${gBody})`} />
          <polygon points="0,6 100,6 50,100" fill={`url(#${gGrid})`} />
          <polygon points="0,6 100,6 50,100" fill={`url(#${gSide})`} />
          <polygon points="0,6 100,6 50,100" fill={`url(#${gTip})`} />

          {/* Rim — two-tone band for thickness */}
          <rect x="-2" y="2" width="104" height="5.2" fill="#4A2A0E" opacity="0.55" rx="1.2" />
          <rect x="-1" y="1.2" width="102" height="4" fill={`url(#${gBody})`} rx="1" />
          <rect x="0" y="1.6" width="100" height="1.2" fill="rgba(255,235,200,0.7)" rx="0.6" />
        </svg>
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
            </div>
          </div>
        );
      })}

      {/* Toppings on top scoop (0-3 levels based on question count) */}
      {scoops.length > 0 && tc > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            width: domeBox,
            height: domeBox,
            bottom: topScoopBottom,
            zIndex: 10 + scoops.length + 5,
          }}
          aria-label={`토핑 ${tc}개`}
        >
          {/* Level 1+: cherry on top */}
          <div
            className="absolute"
            style={{
              left: "50%",
              top: "6%",
              transform: "translateX(-50%)",
              fontSize: domeBox * 0.22,
              lineHeight: 1,
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))",
            }}
          >
            🍒
          </div>

          {/* Level 2+: sprinkles ring around the dome */}
          {tc >= 2 &&
            Array.from({ length: 9 }).map((_, i) => {
              const angle = (Math.PI / 9) * (i + 0.5); // 0..π across the visible dome
              const r = domeBox * 0.36;
              const cx = 50 + Math.cos(angle) * (r / domeBox) * 100;
              const cy = 38 - Math.sin(angle) * (r / domeBox) * 100 * 0.55;
              const colors = ["#ff5fa2", "#ffd166", "#7ad3a7", "#7bb7ff", "#c79bff"];
              return (
                <div
                  key={`spr-${i}`}
                  className="absolute"
                  style={{
                    left: `${cx}%`,
                    top: `${cy}%`,
                    width: domeBox * 0.05,
                    height: domeBox * 0.018,
                    borderRadius: 999,
                    background: colors[i % colors.length],
                    transform: `translate(-50%, -50%) rotate(${(angle * 180) / Math.PI - 90}deg)`,
                    boxShadow: "0 1px 1px rgba(0,0,0,0.18)",
                  }}
                />
              );
            })}

          {/* Level 3: chocolate chips + mint leaf accent */}
          {tc >= 3 && (
            <>
              {[
                { left: "28%", top: "30%" },
                { left: "70%", top: "32%" },
                { left: "40%", top: "44%" },
                { left: "60%", top: "44%" },
              ].map((p, i) => (
                <div
                  key={`chip-${i}`}
                  className="absolute"
                  style={{
                    left: p.left,
                    top: p.top,
                    width: domeBox * 0.06,
                    height: domeBox * 0.05,
                    borderRadius: "40%",
                    background:
                      "radial-gradient(circle at 35% 30%, #8a5a2e 0%, #4a2a10 80%)",
                    transform: "translate(-50%, -50%) rotate(20deg)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                />
              ))}
              <div
                className="absolute"
                style={{
                  left: "58%",
                  top: "10%",
                  fontSize: domeBox * 0.13,
                  lineHeight: 1,
                  transform: "translateX(-50%) rotate(15deg)",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
                }}
              >
                🌿
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
