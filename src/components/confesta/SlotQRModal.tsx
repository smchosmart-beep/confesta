import { useEffect } from "react";
import QRCode from "react-qr-code";
import { X, Printer, RefreshCw } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  payload: string;
  onRotate?: () => void;
  rotating?: boolean;
}

export function SlotQRModal({
  open,
  onClose,
  title,
  subtitle,
  payload,
  onRotate,
  rotating,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:bg-white print:p-0"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-card rounded-3xl p-6 sm:p-8 shadow-pink border border-white/60 print:shadow-none print:border-0 print:max-w-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center print:hidden"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5 print:mb-8">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            주문 QR
          </p>
          <h3 className="text-xl font-extrabold mt-1">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl flex items-center justify-center print:p-8">
          <QRCode value={payload} size={280} style={{ width: "100%", height: "auto", maxWidth: 320 }} />
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-3 font-mono break-all print:text-[10px]">
          {payload}
        </p>

        <div className="mt-5 flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="bounce-press flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-grad-blueberry text-white font-bold px-4 py-2.5 shadow-cream"
          >
            <Printer className="w-4 h-4" />
            인쇄
          </button>
          {onRotate && (
            <button
              onClick={onRotate}
              disabled={rotating}
              className="bounce-press inline-flex items-center justify-center gap-2 rounded-full bg-muted text-foreground font-bold px-4 py-2.5 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${rotating ? "animate-spin" : ""}`} />
              재발급
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
