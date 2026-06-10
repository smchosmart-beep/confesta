import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { QuestionStream } from "@/components/confesta/QuestionStream";
import { ToppingTubScene } from "@/components/confesta/ToppingTubScene";
import { useConfestaStore, makePickupQR } from "@/lib/confesta/store";
import { SESSIONS } from "@/lib/confesta/mockData";
import { Sparkles, MessageSquareText, QrCode } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";

export const Route = createFileRoute("/presenter")({
  head: () => ({
    meta: [
      { title: "발표자 뷰 — Confesta" },
      {
        name: "description",
        content: "발표자용 토핑 키워드 & 질문 목록 · 세션 종료 직전 수령 QR 노출.",
      },
      { property: "og:title", content: "발표자 뷰 — Confesta" },
      { property: "og:description", content: "발표자를 위한 컨트롤 센터." },
    ],
  }),
  component: PresenterView,
});

const QR_INTERVAL_MS = 15_000;

type PresenterTab = "cloud" | "questions" | "pickup";

function PresenterView() {
  const [sessionId, setSessionId] = useState(SESSIONS[0].id);
  const session = SESSIONS.find((s) => s.id === sessionId)!;
  const [tab, setTab] = useState<PresenterTab>("cloud");

  const rotate = useConfestaStore((s) => s.rotatePresenterNonce);
  const noncePair = useConfestaStore((s) => s.presenterNonces[sessionId]);

  const [progress, setProgress] = useState(100);

  // 수령 QR은 탭이 활성화된 동안에만 갱신
  useEffect(() => {
    if (tab !== "pickup") return;
    rotate(sessionId, "pickup");
    setProgress(100);
    const start = Date.now();
    const tickId = window.setInterval(() => {
      const elapsed = (Date.now() - start) % QR_INTERVAL_MS;
      setProgress(100 - (elapsed / QR_INTERVAL_MS) * 100);
    }, 100);
    const rotateId = window.setInterval(() => {
      rotate(sessionId, "pickup");
    }, QR_INTERVAL_MS);
    return () => {
      window.clearInterval(tickId);
      window.clearInterval(rotateId);
    };
  }, [sessionId, rotate, tab]);

  const pickupQR = noncePair?.pickup ? makePickupQR(sessionId, noncePair.pickup) : "";

  const tabs: { value: PresenterTab; label: string; icon: React.ReactNode }[] = [
    { value: "cloud", label: "토핑 키워드", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: "questions", label: "질문 목록", icon: <MessageSquareText className="w-3.5 h-3.5" /> },
    { value: "pickup", label: "수령 QR", icon: <QrCode className="w-3.5 h-3.5" /> },
  ];

  return (
    <main className="min-h-screen pb-16">
      <RoleHeader
        role="발표자 (Presenter)"
        description={`${session.title} · ${session.room}`}
        color="blue"
      />

      <section className="px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="mb-4">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">
            세션 선택
          </label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full bg-grad-cream border border-white/70 rounded-full px-4 py-2.5 text-sm font-semibold outline-none shadow-cream"
          >
            {SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                Day {s.day} · {s.timeSlot} · {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5 overflow-x-auto -mx-1 px-1">
          <div className="inline-flex p-1 bg-grad-muted rounded-full shadow-cream border border-white/60">
            {tabs.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`bounce-press inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap ${
                  tab === t.value
                    ? "bg-grad-strawberry text-white shadow-pink"
                    : "text-foreground/70"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "cloud" && (
          <div className="animate-fade-in space-y-3">
            <p className="text-sm text-muted-foreground">
              청중 질문에서 명사 키워드만 골라 토핑처럼 통 위에 쌓입니다. 5초마다 갱신.
            </p>
            <ToppingTubScene sessionId={sessionId} />
          </div>
        )}

        {tab === "questions" && (
          <div className="animate-fade-in">
            <QuestionStream sessionId={sessionId} />
          </div>
        )}

        {tab === "pickup" && (
          <div className="animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-pink border border-white/60">
              <div className="absolute inset-0 bg-grad-cream" />
              <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
              <ToppingScatter density="med" seed="presenter-pickup" />
              <div className="relative flex items-center justify-between mb-3">
                <h3 className="text-lg font-extrabold bg-clip-text text-transparent bg-grad-sunset">
                  ② 수령 QR
                </h3>
                <span className="text-xs bg-grad-strawberry text-white font-bold px-2.5 py-1 rounded-full shadow-pink">
                  15초마다 갱신
                </span>
              </div>
              <p className="relative text-xs sm:text-sm text-muted-foreground mb-4">
                세션 <strong className="text-foreground">종료 직전</strong>에만 잠깐 띄워서 청중이 스캔하도록 하세요.
                주문 QR은 세션 입구에 인쇄된 것을 사용합니다.
              </p>
              <div className="relative bg-white p-5 sm:p-6 rounded-2xl flex justify-center border-2 border-white shadow-cream">
                {pickupQR && (
                  <QRCode
                    value={pickupQR}
                    size={360}
                    level="M"
                    style={{ maxWidth: "100%", height: "auto", width: "100%" }}
                  />
                )}
              </div>
              <div className="relative mt-4 h-3 rounded-full bg-white/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-linear bg-grad-sunset"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="relative text-center mt-2 text-xs text-muted-foreground font-mono">
                다음 갱신까지 약 {Math.ceil((progress / 100) * 15)}초
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
