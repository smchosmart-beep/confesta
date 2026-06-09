import { Maximize2, Smartphone, Tv2 } from "lucide-react";

export type PresenterMode = "handheld" | "stage";

interface Props {
  mode: PresenterMode;
  onChange: (m: PresenterMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function PresenterModeToggle({
  mode,
  onChange,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex p-1 bg-muted rounded-full shadow-cream">
        <button
          type="button"
          onClick={() => onChange("handheld")}
          className={`bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
            mode === "handheld"
              ? "bg-primary text-primary-foreground shadow-pink"
              : "text-foreground/70"
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" /> 핸드헬드
        </button>
        <button
          type="button"
          onClick={() => onChange("stage")}
          className={`bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
            mode === "stage"
              ? "bg-secondary text-secondary-foreground shadow-blue"
              : "text-foreground/70"
          }`}
        >
          <Tv2 className="w-3.5 h-3.5" /> 무대
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleFullscreen}
        className="bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold bg-foreground text-background"
        aria-label="풀스크린 토글"
      >
        <Maximize2 className="w-3.5 h-3.5" />
        {isFullscreen ? "해제" : "풀스크린"}
      </button>
    </div>
  );
}
