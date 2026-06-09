import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { Keyboard, X } from "lucide-react";

interface Props {
  onScan: (text: string) => void;
  onClose?: () => void;
  hintLine?: string;
}

export function CameraScanner({ onScan, onClose, hintLine }: Props) {
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-black shadow-blue border-4 border-secondary/40">
        <Scanner
          onScan={(results) => {
            if (results?.[0]?.rawValue) onScan(results[0].rawValue);
          }}
          onError={() => {}}
          constraints={{ facingMode: "environment" }}
          styles={{
            container: { width: "100%", height: "100%" },
            video: { width: "100%", height: "100%", objectFit: "cover" },
          }}
          components={{ finder: false }}
        />
        {/* Guide overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-2/3 aspect-square relative">
            {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
              <span
                key={i}
                className={`absolute ${pos} w-8 h-8 border-secondary`}
                style={{
                  borderTopWidth: pos.includes("top") ? 4 : 0,
                  borderBottomWidth: pos.includes("bottom") ? 4 : 0,
                  borderLeftWidth: pos.includes("left") ? 4 : 0,
                  borderRightWidth: pos.includes("right") ? 4 : 0,
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-2 backdrop-blur"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {hintLine && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          {hintLine}
        </p>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="w-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <Keyboard className="w-4 h-4" />
          {showManual ? "수동 입력 닫기" : "카메라가 안 될 때 — 수동 입력"}
        </button>

        {showManual && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) {
                onScan(manual.trim());
                setManual("");
              }
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="confesta:..."
              className="flex-1 bg-card border border-border rounded-full px-4 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="bounce-press bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-bold"
            >
              검증
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
