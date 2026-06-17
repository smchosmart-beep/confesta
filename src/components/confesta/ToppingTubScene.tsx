import { useEffect, useId, useMemo, useState } from "react";
import { useSessionToppings } from "@/hooks/use-toppings";
import { extractAnswerKeywords } from "@/lib/confesta/keywords";
import { Cherry, ChocChip, StarSprinkle, Heart, Sprinkle } from "./ToppingDecor";

interface Props {
  sessionId: string;
  /** Small (pint) for handheld; large (half-gallon) for stage. */
  compact?: boolean;
  /** Filter answers to a specific prompt. undefined → no filter (all answers). null → no prompt selected. */
  promptId?: string | null;
  /** Total prompts in this session — drives empty-state copy. */
  promptsCount?: number;
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

export function ToppingTubScene({
  sessionId,
  compact = false,
  promptId,
  promptsCount,
}: Props) {
  const { toppings: allToppings } = useSessionToppings(sessionId);
  const toppings = useMemo(
    () =>
      allToppings.filter(
        (t) =>
          t.kind === "answer" &&
          (promptId === undefined ? true : t.promptId === promptId),
      ),
    [allToppings, promptId],
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, []);

  const keywords = useMemo(() => {
    const all = extractAnswerKeywords(toppings.map((t) => t.text));
    return all.slice(0, compact ? 14 : 22);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toppings, compact, tick]);

  const emptyMessage =
    promptsCount === 0
      ? "키워드 질문을 먼저 만들어 주세요"
      : promptId === null
        ? "표시할 질문을 선택해 주세요"
        : promptId !== undefined
          ? "이 질문에 대한 응답을 기다리는 중…"
          : "토핑이 도착하면 키워드가 눈처럼 내려옵니다 🍒";

  const maxCount = keywords[0]?.count ?? 1;

  // Snow-fall placement: high-frequency words → bigger, fall near center column.
  // Low-frequency → smaller, spread further toward edges.
  const placed = useMemo(() => {
    return keywords.map((kw, i) => {
      const ratio = kw.count / maxCount; // 0..1
      const size = compact
        ? 13 + ratio * 19 // 13–32
        : 18 + ratio * 38; // 18–56

      const hash = hashStr(kw.word);
      // Horizontal: high-freq tight to center, low-freq wider spread.
      // spread half-width in %: 6% (top word) up to 44% (rare words)
      const spreadHalf = 6 + (1 - ratio) * 38;
      const xOffset = (((hash % 1000) / 1000) - 0.5) * 2 * spreadHalf;
      const x = 50 + xOffset;

      // Fall duration: heavier (bigger) falls a touch slower; add per-word jitter.
      const baseDur = compact ? 7 : 9;
      const dur = baseDur + ratio * 3 + ((hash >> 5) % 100) / 25; // ~7–16s
      // Negative delay so each starts at different point on the loop.
      const delay = -((hash >> 11) % 1000) / 1000 * dur;
      const swayDur = 2.6 + ((hash >> 17) % 100) / 40; // 2.6–5.1s
      const swayDelay = -((hash >> 3) % 1000) / 1000 * swayDur;

      const rot = ((hash >> 3) % 30) - 15;
      const gradient = PILL_GRADS[i % PILL_GRADS.length];
      const Icon = ICONS[hash % ICONS.length];
      // z-index: bigger (more frequent) in front
      const z = 10 + Math.round(ratio * 90);
      return {
        kw, size, x, rot, gradient, Icon,
        dur, delay, swayDur, swayDelay, z,
        key: kw.word,
      };
    });
  }, [keywords, maxCount, compact]);


  const containerH = compact ? "h-[360px]" : "h-[460px] sm:h-[560px] xl:h-[720px]";

  return (
    <div
      className={`relative isolate overflow-hidden rounded-3xl border border-white/60 shadow-cream ${containerH}`}
    >
      <div className="absolute inset-0 bg-grad-cream" />
      <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />

      {/* Falling topping layer — upper 62% of the scene (lands on the ice cream mound) */}
      <div className="absolute inset-x-0 top-0 h-[62%] overflow-hidden pointer-events-none">
        {placed.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-muted-foreground pointer-events-auto">
            {emptyMessage}
          </div>
        ) : (
          placed.map((p) => (
            <div
              key={p.key}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: "-10%",
                zIndex: p.z,
                ["--rot" as string]: `${p.rot}deg`,
                animation: `toppingSnow ${p.dur}s linear ${p.delay}s infinite`,
                willChange: "top, transform",
              }}
              title={`${p.kw.count}회`}
            >
              <span
                className="inline-flex items-center gap-1.5 rounded-full font-extrabold text-white whitespace-nowrap shadow-pink border border-white/70"
                style={{
                  fontSize: `${p.size}px`,
                  lineHeight: 1,
                  backgroundImage: p.gradient,
                  paddingInline: `${Math.max(8, p.size * 0.45)}px`,
                  paddingBlock: `${Math.max(4, p.size * 0.25)}px`,
                  animation: `toppingSway ${p.swayDur}s ease-in-out ${p.swayDelay}s infinite`,
                  display: "inline-flex",
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
      <IceCreamTub compact={compact} />
    </div>
  );
}

/* =========================================================== */

function IceCreamTub({
  compact,
}: {
  compact: boolean;
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  // VB: 400 x 280 — mound on top, cylinder body below
  return (
    <svg
      viewBox="0 0 400 280"
      className="absolute inset-x-0 bottom-0 w-full pointer-events-none"
      style={{ height: compact ? "62%" : "56%" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`tub-body-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1E6D2" />
        </linearGradient>
        <linearGradient id={`tub-label-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#FFC1D8" />
          <stop offset="50%" stopColor="#FF4D9D" />
          <stop offset="100%" stopColor="#FF8A1F" />
        </linearGradient>
        <linearGradient id={`scoop-straw-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFB6C1" />
          <stop offset="100%" stopColor="#FF6B95" />
        </linearGradient>
        <linearGradient id={`scoop-mint-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#B2F5EA" />
          <stop offset="100%" stopColor="#4FD1C5" />
        </linearGradient>
        <linearGradient id={`scoop-mango-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#F6AD55" />
        </linearGradient>
        <filter
          id={`mound-soft-${uid}`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feOffset dy="2" dx="1" />
          <feComposite
            in2="SourceAlpha"
            operator="arithmetic"
            k2={-1}
            k3={1}
            result="shadowDiff"
          />
          <feFlood floodColor="white" floodOpacity="0.45" />
          <feComposite in2="shadowDiff" operator="in" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
      </defs>

      {/* Three round overlapping scoops sitting on the tub rim */}
      {/* Left: mint */}
      <path
        d="M 40,112 Q 40,30 130,30 Q 220,30 220,112 Z"
        fill={`url(#scoop-mint-${uid})`}
        filter={`url(#mound-soft-${uid})`}
      />
      <path
        d="M 70,58 Q 90,42 120,46"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Right: mango */}
      <path
        d="M 180,112 Q 180,38 270,38 Q 360,38 360,112 Z"
        fill={`url(#scoop-mango-${uid})`}
        filter={`url(#mound-soft-${uid})`}
      />
      <path
        d="M 270,60 Q 295,48 335,58"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Center front: strawberry (largest, on top) */}
      <path
        d="M 100,112 Q 100,12 200,12 Q 300,12 300,112 Z"
        fill={`url(#scoop-straw-${uid})`}
        filter={`url(#mound-soft-${uid})`}
      />
      <path
        d="M 150,40 Q 200,22 250,40"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.5"
      />


      {/* Tub rim (lid edge) */}
      <ellipse cx="200" cy="110" rx="150" ry="14" fill="#F4ECDE" />
      <ellipse cx="200" cy="108" rx="150" ry="10" fill="#FFFFFF" opacity="0.6" />

      {/* Tub body — slight taper */}
      <path
        d="M 56,112 L 64,266 Q 64,272 70,272 L 330,272 Q 336,272 336,266 L 344,112 Z"
        fill={`url(#tub-body-${uid})`}
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
        fill={`url(#tub-label-${uid})`}
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
        y="198"
        textAnchor="middle"
        fontFamily="'Times New Roman', Georgia, serif"
        fontWeight="900"
        fontSize="28"
        fill="#FFFFFF"
        style={{ letterSpacing: "0.12em" }}
      >
        2026 Confesta
      </text>

      {/* Base shadow */}
      <ellipse cx="200" cy="274" rx="140" ry="4" fill="#000" opacity="0.08" />
    </svg>
  );
}
