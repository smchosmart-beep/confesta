import { useEffect, useRef } from "react";
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
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handlePrint = () => {
    const svgEl = qrRef.current?.querySelector("svg");
    if (!svgEl) return;
    // 원본 QR SVG를 가로/세로 2배로 확대해서 인쇄
    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    const rect = svgEl.getBoundingClientRect();
    const baseW = rect.width || svgEl.clientWidth || 280;
    const baseH = rect.height || svgEl.clientHeight || 280;
    const w = Math.round(baseW * 2);
    const h = Math.round(baseH * 2);
    // 화면용 인라인 스타일(width:100%, max-width:320px 등) 제거
    cloned.removeAttribute("style");
    // viewBox 보존 (없으면 원본 크기로 설정)
    if (!cloned.getAttribute("viewBox")) {
      cloned.setAttribute("viewBox", `0 0 ${Math.round(baseW)} ${Math.round(baseH)}`);
    }
    cloned.setAttribute("width", String(w));
    cloned.setAttribute("height", String(h));
    cloned.setAttribute("style", `width:${w}px !important;height:${h}px !important;max-width:none !important;display:block;`);
    const svgMarkup = new XMLSerializer().serializeToString(cloned);
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) {
      alert("팝업이 차단되어 인쇄할 수 없습니다. 브라우저의 팝업 차단을 해제해주세요.");
      return;
    }
    const esc = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
      );
    win.document.write(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${esc(title)} · 주문 QR</title>
<style>
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", system-ui, sans-serif; }
  .wrap { min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start; padding: 6mm 0 0; text-align: center; box-sizing: border-box; }
  .label { font-size: 18px; font-weight: 700; letter-spacing: .12em;
    text-transform: uppercase; color: #555; }
  h1 { font-size: 46px; font-weight: 900; margin: 4px 0 2px; line-height: 1.05; }
  .sub { font-size: 24px; color: #222; margin: 0 0 18mm; font-weight: 600; }
  .qr { display: inline-flex; align-items: center; justify-content: center; margin: 0 0 10mm; }
  .qr svg { display: block !important; width: ${w}px !important; height: ${h}px !important; max-width: none !important; }
  .footer { margin-top: 8mm; text-align: center; }
  .footer .event { font-size: 22px; color: #777; letter-spacing: 0.08em; }
  .footer .name { font-size: 56px; font-weight: 900; color: #111; margin-top: 4px; letter-spacing: 0.06em; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="label">주문 QR</div>
    <h1>${esc(title)}</h1>
    <p class="sub">${esc(subtitle)}</p>
    <div class="qr">${svgMarkup}</div>
    <div class="footer">
      <div class="event">2026 AI 디지털 컨퍼런스&amp;페스티벌</div>
      <div class="name">Confesta</div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.focus(); window.print(); }, 50);
    });
    window.addEventListener('afterprint', function () { window.close(); });
  </script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-card rounded-3xl p-6 sm:p-8 shadow-pink border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            주문 QR
          </p>
          <h3 className="text-xl font-extrabold mt-1">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div
          ref={qrRef}
          className="bg-white p-4 sm:p-6 rounded-2xl flex items-center justify-center"
        >
          <QRCode value={payload} size={252} style={{ width: "100%", height: "auto", maxWidth: 288 }} />
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-3 font-mono break-all">
          {payload}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={handlePrint}
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
