import { ChevronLeft, ChevronRight, Pause, Play, Square } from "lucide-react";
import { useConfestaStore } from "@/lib/confesta/store";

interface Props {
  compact?: boolean;
}

export function SlideControlPanel({ compact = false }: Props) {
  const slideIndex = useConfestaStore((s) => s.slideIndex);
  const slideTotal = useConfestaStore((s) => s.slideTotal);
  const paused = useConfestaStore((s) => s.slidePaused);
  const next = useConfestaStore((s) => s.nextSlide);
  const prev = useConfestaStore((s) => s.prevSlide);
  const togglePause = useConfestaStore((s) => s.toggleSlidePause);
  const reset = useConfestaStore((s) => s.resetSlides);

  const progress = ((slideIndex + 1) / Math.max(slideTotal, 1)) * 100;

  return (
    <div
      className={`bg-card border border-border rounded-3xl shadow-cream ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h4 className="font-bold text-sm">슬라이드 컨트롤</h4>
        <span className="font-mono text-lg font-extrabold tabular-nums">
          {String(slideIndex + 1).padStart(2, "0")}{" "}
          <span className="text-muted-foreground text-sm">
            / {slideTotal}
          </span>
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, var(--secondary), var(--primary))",
          }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={prev}
          disabled={slideIndex === 0}
          className="bounce-press rounded-full bg-muted text-foreground font-bold py-2.5 flex items-center justify-center disabled:opacity-40"
          aria-label="이전 슬라이드"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={togglePause}
          className="bounce-press rounded-full bg-secondary text-secondary-foreground font-bold py-2.5 flex items-center justify-center shadow-blue"
          aria-label={paused ? "재생" : "일시정지"}
        >
          {paused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={reset}
          className="bounce-press rounded-full bg-muted text-foreground font-bold py-2.5 flex items-center justify-center"
          aria-label="처음으로"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={slideIndex >= slideTotal - 1}
          className="bounce-press rounded-full bg-primary text-primary-foreground font-bold py-2.5 flex items-center justify-center shadow-pink disabled:opacity-40"
          aria-label="다음 슬라이드"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 text-center font-mono">
        ← / → · Space · Esc
      </p>
    </div>
  );
}
