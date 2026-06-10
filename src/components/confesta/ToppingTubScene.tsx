import { useEffect, useMemo, useState } from "react";
import { useConfestaStore } from "@/lib/confesta/store";
import { extractKeywords } from "@/lib/confesta/keywords";
import { Cherry, ChocChip, StarSprinkle, Heart, Sprinkle } from "./ToppingDecor";

interface Props {
  sessionId: string;
  /** Small (pint) for handheld; large (half-gallon) for stage. */
  compact?: boolean;
}

const ICONS = [Cherry, ChocChip, StarSprinkle, Heart, Sprinkle] as const;
const PILL_GRADS = [
  "var(--gradient-strawberry)",
  "var(--gradient-mint)",
  "var(--gradient-mango)",
  "var(--gradient-blueberry)",
  "var(--gradient-sunset)",
  "var(--gradient-aurora)",
];

function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function ToppingTubScene({ sessionId, compact = false }: Props) {
  const allToppings = useConfestaStore((s) => s.toppings);
  const toppings = useMemo(
    () => allToppings.filter((t) => t.sessionId === sessionId),
    [allToppings, sessionId],
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  const keywords = useMemo(() => {
    const all = extractKeywords(toppings.map((t) => t.text));
    return all.slice(0, compact ? 14 : 22);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toppings, compact, tick]);

  const maxCount = keywords[0]?.count ?? 1;

  // Stable positions piled over the ice cream mound.
  // Rank 0 -> center-top of mound. Larger ranks fan out & higher.
  const placed = useMemo(() => {
    return keywords.map((kw, i) => {
      // size px
      const ratio = kw.count / maxCount;
      const size = compact
        ? 13 + ratio * 17 // 13–30
        : 18 + ratio * 30; // 18–48

      // pile placement: spiral fan
      // x: alternating around center, drifting outward
      const lane = Math.ceil(i / 2);
      const side = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
      const hash = hashStr(kw.word);
      const jitterX = ((hash % 100) / 100 - 0.5) * 8; // ±4%
      const jitterY = (((hash >> 7) % 100) / 100) * 6;
      // x centered at 50%, fan ±36%
      const x = 50 + side * Math.min(lane * 10, 38) + jitterX;
      // y: 0 = top of pile area, higher rank => lower (closer to mound surface)
      // rank 0 highest on mound (smallest y in pile area = bottom)
      // We want rank 0 visually largest, sitting near top-of-mound center
      const y = 78 - Math.min(i, 10) * 6 - jitterY; // % from top of pile area
      const rot = ((hash >> 3) % 30) - 15;
      const gradient = PILL_GRADS[i % PILL_GRADS.length];
      const Icon = ICONS[hash % ICONS.length];
      return { kw, size, x, y, rot, gradient, Icon, key: `${kw.word}-${tick}` };
    });
  }, [keywords, maxCount, compact, tick]);

  const containerH = compact ? "h-[360px]" : "h-[460px] sm:h-[560px]";

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/60 shadow-cream ${containerH}`}
    >
      <div className="absolute inset-0 bg-grad-cream" />
      <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />

      {/* Topping pile layer — upper 62% of the scene, sitting on the mound */}
      <div className="absolute inset-x-0 top-0 h-[62%]">
        {placed.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-muted-foreground">
            토핑이 도착하면 키워드가 통 위로 쌓입니다 🍒
          </div>
        ) : (
          placed.map((p, i) => (
            <div
              key={p.key}
              className="topping-drop absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                ["--rot" as string]: `${p.rot}deg`,
                animationDelay: `${Math.min(i * 60, 900)}ms`,
                zIndex: 100 - i,
              }}
              title={`${p.kw.count}회`}
            >
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-extrabold text-white whitespace-nowrap shadow-pink border border-white/70"
                style={{
                  fontSize: `${p.size}px`,
                  lineHeight: 1,
                  backgroundImage: p.gradient,
                  paddingInline: `${Math.max(8, p.size * 0.45)}px`,
                  paddingBlock: `${Math.max(4, p.size * 0.25)}px`,
                }}
              >
                <p.Icon size={Math.max(12, p.size * 0.7)} />
                <span
                  className="drop-shadow"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.18)" }}
                >
                  {p.kw.word}
                </span>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Ice cream tub — bottom 50% */}
      <IceCreamTub compact={compact} sessionId={sessionId} />
    </div>
  );
}

/* =========================================================== */

function IceCreamTub({
  compact,
  sessionId,
}: {
  compact: boolean;
  sessionId: string;
}) {
  // VB: 400 x 280 — mound on top, cylinder body below
  return (
    <svg
      viewBox="0 0 400 280"
      className="absolute inset-x-0 bottom-0 w-full pointer-events-none"
      style={{ height: compact ? "62%" : "56%" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`tub-body-${sessionId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1E6D2" />
        </linearGradient>
        <linearGradient id={`tub-label-${sessionId}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#FFC1D8" />
          <stop offset="50%" stopColor="#FF4D9D" />
          <stop offset="100%" stopColor="#FF8A1F" />
        </linearGradient>
        <radialGradient id={`mound-straw-${sessionId}`} cx="35%" cy="30%">
          <stop offset="0%" stopColor="#FFE4EE" />
          <stop offset="60%" stopColor="#FFA8C7" />
          <stop offset="100%" stopColor="#FF4D9D" />
        </radialGradient>
        <radialGradient id={`mound-mint-${sessionId}`} cx="65%" cy="35%">
          <stop offset="0%" stopColor="#E4FBF2" />
          <stop offset="70%" stopColor="#7EE0C8" />
          <stop offset="100%" stopColor="#2FB99A" />
        </radialGradient>
        <radialGradient id={`mound-van-${sessionId}`} cx="50%" cy="30%">
          <stop offset="0%" stopColor="#FFFCEF" />
          <stop offset="100%" stopColor="#F2D898" />
        </radialGradient>
      </defs>

      {/* Ice cream mound — soft scoop bulging out the top of the tub */}
      <path
        d="M 60,90 Q 80,30 200,20 Q 320,30 340,90 Q 340,110 200,110 Q 60,110 60,90 Z"
        fill={`url(#mound-van-${sessionId})`}
      />
      <path
        d="M 80,88 Q 100,42 180,38 Q 260,46 270,90 Q 270,108 180,108 Q 80,108 80,88 Z"
        fill={`url(#mound-straw-${sessionId})`}
        opacity="0.85"
      />
      <path
        d="M 210,92 Q 230,52 290,52 Q 330,62 335,95 Q 335,110 270,110 Q 210,110 210,92 Z"
        fill={`url(#mound-mint-${sessionId})`}
        opacity="0.85"
      />
      {/* Mound highlight */}
      <ellipse cx="160" cy="55" rx="50" ry="10" fill="#FFFFFF" opacity="0.45" />

      {/* Tub rim (lid edge) */}
      <ellipse cx="200" cy="110" rx="150" ry="14" fill="#F4ECDE" />
      <ellipse cx="200" cy="108" rx="150" ry="10" fill="#FFFFFF" opacity="0.6" />

      {/* Tub body — slight taper */}
      <path
        d="M 56,112 L 64,266 Q 64,272 70,272 L 330,272 Q 336,272 336,266 L 344,112 Z"
        fill={`url(#tub-body-${sessionId})`}
        stroke="#E6D7BD"
        strokeWidth="1.5"
      />

      {/* Label band */}
      <rect
        x="70"
        y="150"
        width="260"
        height="78"
        rx="10"
        fill={`url(#tub-label-${sessionId})`}
      />
      <rect
        x="70"
        y="150"
        width="260"
        height="78"
        rx="10"
        fill="url(#shimmer-overlay)"
        opacity="0.0"
      />
      <text
        x="200"
        y="184"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui"
        fontWeight="900"
        fontSize="22"
        fill="#FFFFFF"
        style={{ letterSpacing: "0.18em" }}
      >
        CONFESTA
      </text>
      <text
        x="200"
        y="210"
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        fontWeight="700"
        fontSize="12"
        fill="#FFF6E8"
        style={{ letterSpacing: "0.32em" }}
      >
        QUESTION PINT · 1L
      </text>

      {/* Base shadow */}
      <ellipse cx="200" cy="274" rx="140" ry="4" fill="#000" opacity="0.08" />
    </svg>
  );
}
