import { useState } from "react";
import { Camera, Check, IceCream, Info } from "lucide-react";
import type { Order } from "@/lib/confesta/types";
import { SESSIONS, getCategory, CATEGORIES } from "@/lib/confesta/mockData";
import { parseSessionQR, parseSlotKey } from "@/lib/confesta/shared";
import { useAudience } from "@/hooks/use-audience";
import { CameraScanner } from "./CameraScanner";
import { ToppingScatter } from "./ToppingDecor";

const FLAVOR_GRAD: Record<string, string> = {
  mint: "bg-grad-mint",
  strawberry: "bg-grad-strawberry",
  mango: "bg-grad-mango",
  blueberry: "bg-grad-blueberry",
  chocolate: "bg-grad-chocolate",
};

interface Props {
  order: Order;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Resolve display info from either legacy SESSIONS id or new slot-key session_id.
function resolveSessionDisplay(order: Order) {
  const sessionId = order.sessionId;
  const legacy = SESSIONS.find((s) => s.id === sessionId);
  if (legacy) {
    return {
      title: legacy.title,
      sub: `${legacy.presenter} · ${legacy.room} · ${legacy.timeSlot}`,
      flavor: getCategory(legacy.category).flavor,
      catLabel: getCategory(legacy.category).label,
    };
  }
  const slot = parseSlotKey(sessionId);
  if (slot) {
    const hash = [...slot.room].reduce((a, c) => a + c.charCodeAt(0), 0);
    const cat = CATEGORIES[hash % CATEGORIES.length];
    const adminTitle = (order.sessionTitle ?? "").trim();
    return {
      title: adminTitle.length > 0 ? adminTitle : slot.room,
      sub: `Day ${slot.day} · ${slot.period === "am" ? "오전" : "오후"} · ${slot.room}`,
      flavor: cat.flavor,
      catLabel: cat.label,
    };
  }
  return null;
}

export function OrderCard({ order }: Props) {
  const display = resolveSessionDisplay(order.sessionId);
  const { pickup } = useAudience();
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  if (!display) return null;
  const picked = !!order.pickedUpAt;


  const handleScan = async (text: string) => {
    const parsed = parseSessionQR(text);
    if (parsed?.kind === "order") {
      setFeedback({ ok: false, msg: "이건 주문 QR이에요 (수령 QR을 스캔하세요)" });
      return;
    }
    if (parsed?.kind === "pickup" && parsed.sessionId !== order.sessionId) {
      setFeedback({ ok: false, msg: "다른 세션의 수령 QR입니다" });
      return;
    }
    try {
      const result = await pickup(text);
      if (result.ok) {
        setFeedback({ ok: true, msg: "수령 완료! 스쿱이 콘에 쌓였어요 🍦" });
        setScanning(false);
      } else {
        setFeedback({ ok: false, msg: result.message });
      }
    } catch (e) {
      setFeedback({ ok: false, msg: "오류가 발생했어요" });
      console.error(e);
    }
  };

  return (
    <div className="relative overflow-hidden bg-card rounded-3xl p-5 shadow-cream border border-white/60 flex flex-col gap-3">
      <div className="absolute inset-0 bg-grad-sunset-soft opacity-50" />
      <ToppingScatter density="low" seed={`order-${order.id}`} />

      <div className="relative flex items-start justify-between gap-2">
        <span
          className={`${FLAVOR_GRAD[display.flavor]} text-white text-xs font-bold px-3 py-1 rounded-full shadow-cream`}
        >
          {display.catLabel}
        </span>
        <span
          className={`text-xs font-extrabold px-3 py-1 rounded-full text-white shadow-cream ${
            picked ? "bg-grad-success" : "bg-grad-blueberry"
          }`}
        >
          {picked ? "② 수령 완료" : "① 주문 접수"}
        </span>
      </div>

      <div className="relative">
        <h3 className="text-lg font-bold leading-snug">{display.title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {display.sub}
        </p>

        <p className="text-xs text-muted-foreground mt-1.5" suppressHydrationWarning>
          주문 {fmtTime(order.orderedAt)}
          {picked && ` · 수령 ${fmtTime(order.pickedUpAt!)}`}
        </p>

        {!picked && (
          <div className="mt-3 inline-flex items-start gap-1.5 bg-white/70 border border-white text-[11px] font-semibold text-foreground/80 px-2.5 py-1.5 rounded-xl shadow-cream">
            <IceCream className="w-3.5 h-3.5 text-pink-500 shrink-0 mt-px" />
            <span>
              아직 스쿱이 쌓이지 않았어요. <strong>수령 QR을 스캔</strong>하면 콘에 1스쿱이 적립돼요.
            </span>
          </div>
        )}
      </div>

      <div className="relative">
        {picked ? (
          <div className="inline-flex items-center gap-2 bg-grad-success text-white rounded-full px-4 py-2 text-sm font-bold shadow-cream" suppressHydrationWarning>
            <Check className="w-4 h-4" />
            {fmtTime(order.pickedUpAt!)} 수령 완료
          </div>
        ) : scanning ? (
          <div>
            <CameraScanner
              onScan={handleScan}
              onClose={() => setScanning(false)}
              hintLine="세션 종료 직전 발표자 화면의 수령 QR을 비추세요"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setScanning(true);
                setFeedback(null);
              }}
              className="bounce-press w-full inline-flex items-center justify-center gap-2 bg-grad-strawberry text-white rounded-full px-5 py-3 text-sm font-bold shadow-pink"
            >
              <Camera className="w-4 h-4" />
              수령 QR 스캔 → 스쿱 적립
            </button>
            <p className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Info className="w-3 h-3" />
              세션 종료 직전 발표자 화면의 수령 QR을 스캔하세요
            </p>
          </div>
        )}

        {feedback && (
          <div
            className={`mt-3 p-3 rounded-2xl text-xs font-semibold text-center text-white shadow-cream ${
              feedback.ok ? "bg-grad-success" : "bg-grad-danger"
            }`}
          >
            {feedback.msg}
          </div>
        )}
      </div>
    </div>
  );
}
