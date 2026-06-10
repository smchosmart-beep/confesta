import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { QuestionStream } from "@/components/confesta/QuestionStream";
import { ToppingTubScene } from "@/components/confesta/ToppingTubScene";
import { useConfestaStore, makePickupQR } from "@/lib/confesta/store";
import { SESSIONS } from "@/lib/confesta/mockData";
import { QrCode, X } from "lucide-react";
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

function PresenterView() {
  const [sessionId, setSessionId] = useState(SESSIONS[0].id);
  const session = SESSIONS.find((s) => s.id === sessionId)!;
  const [pickupOpen, setPickupOpen] = useState(false);

  const rotate = useConfestaStore((s) => s.rotatePresenterNonce);
  const noncePair = useConfestaStore((s) => s.presenterNonces[sessionId]);

  const [progress, setProgress] = useState(100);

  // 수령 QR은 모달이 열린 동안에만 갱신
  useEffect(() => {
    if (!pickupOpen) return;
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
  }, [sessionId, rotate, pickupOpen]);

  const pickupQR = noncePair?.pickup ? makePickupQR(sessionId, noncePair.pickup) : "";

  return (
    <main className="min-h-screen pb-6">
      <RoleHeader
        role="발표자 (Presenter)"
        description={`${session.title} · ${session.room}`}
        color="blue"
      />

      <section className="px-3 sm:px-4">
        {(() => {
          const day = session.day;
          const startHour = parseInt(session.timeSlot.slice(0, 2), 10);
          const period: "am" | "pm" = startHour < 12 ? "am" : "pm";

          const daysAvailable = Array.from(new Set(SESSIONS.map((s) => s.day))).sort();
          const periodsAvailable = Array.from(
            new Set(
              SESSIONS.filter((s) => s.day === day).map((s) =>
                parseInt(s.timeSlot.slice(0, 2), 10) < 12 ? "am" : "pm",
              ),
            ),
          );
          const sessionsInScope = SESSIONS.filter((s) => {
            const sh = parseInt(s.timeSlot.slice(0, 2), 10);
            return s.day === day && (sh < 12 ? "am" : "pm") === period;
          });

          const pickFirstSessionFor = (d: number, p: "am" | "pm") => {
            const first = SESSIONS.find((s) => {
              const sh = parseInt(s.timeSlot.slice(0, 2), 10);
              return s.day === d && (sh < 12 ? "am" : "pm") === p;
            });
            return first?.id;
          };

          const stepBtn = (active: boolean) =>
            `bounce-press px-4 py-2 rounded-full text-sm font-bold border transition ${
              active
                ? "bg-grad-strawberry text-white border-transparent shadow-pink"
                : "bg-card text-foreground border-white/70 shadow-cream hover:bg-muted/40"
            }`;

          return (
            <div className="mb-4 flex flex-col gap-3 bg-card/60 border border-white/60 rounded-3xl p-4 shadow-cream">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    1단계 · 일자 선택
                  </span>
                  <div className="flex gap-2">
                    {daysAvailable.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={stepBtn(d === day)}
                        onClick={() => {
                          const next =
                            pickFirstSessionFor(d, period) ??
                            pickFirstSessionFor(d, period === "am" ? "pm" : "am");
                          if (next) setSessionId(next);
                        }}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPickupOpen(true)}
                  className="bounce-press inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold bg-grad-strawberry text-white shadow-pink shrink-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  수령 QR
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  2단계 · 시간대 선택
                </span>
                <div className="flex gap-2">
                  {(["am", "pm"] as const).map((p) => {
                    const enabled = periodsAvailable.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={!enabled}
                        className={`${stepBtn(p === period && enabled)} ${
                          !enabled ? "opacity-40 cursor-not-allowed" : ""
                        }`}
                        onClick={() => {
                          const next = pickFirstSessionFor(day, p);
                          if (next) setSessionId(next);
                        }}
                      >
                        {p === "am" ? "오전" : "오후"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  3단계 · 세션 선택
                </span>
                <div className="flex flex-col gap-2">
                  {sessionsInScope.map((s) => {
                    const active = s.id === sessionId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSessionId(s.id)}
                        className={`bounce-press text-left rounded-2xl px-4 py-3 border transition ${
                          active
                            ? "bg-grad-blueberry text-white border-transparent shadow-blue"
                            : "bg-card text-foreground border-white/70 shadow-cream hover:bg-muted/40"
                        }`}
                      >
                        <div className="text-xs font-semibold opacity-80">
                          {s.timeSlot} · {s.room}
                        </div>
                        <div className="text-sm font-bold leading-snug">
                          {s.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}


        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-[calc(100vh-180px)]">
          {/* 토핑 키워드 */}
          <div className="space-y-2 flex flex-col h-full">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              토핑 키워드
            </h2>
            <p className="text-sm text-muted-foreground">
              청중 질문에서 명사 키워드를 골라 토핑처럼 통 위에 쌓입니다. 5초마다 갱신.
            </p>
            <div className="flex-1 min-h-0">
              <ToppingTubScene sessionId={sessionId} />
            </div>
          </div>

          {/* 질문 목록 */}
          <div className="space-y-2 flex flex-col h-full overflow-hidden">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              질문 목록
            </h2>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <QuestionStream sessionId={sessionId} />
            </div>
          </div>
        </div>
      </section>

      {/* 수령 QR 모달 */}
      {pickupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setPickupOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-grad-cream rounded-3xl p-5 sm:p-8 shadow-2xl border border-white/60 overflow-hidden">
            <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
            <ToppingScatter density="med" seed="presenter-pickup" />
            <button
              type="button"
              onClick={() => setPickupOpen(false)}
              className="absolute top-4 right-4 z-10 bounce-press bg-white/80 rounded-full p-1.5 shadow-cream"
              aria-label="닫기"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-extrabold bg-clip-text text-transparent bg-grad-sunset">
                  수령 QR
                </h3>
                <span className="text-xs bg-grad-strawberry text-white font-bold px-2.5 py-1 rounded-full shadow-pink">
                  15초마다 갱신
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                세션 <strong className="text-foreground">종료 직전</strong>에만 잠깐 띄워서 청중이 스캔하도록 하세요.
              </p>
              <div className="bg-white p-5 sm:p-6 rounded-2xl flex justify-center border-2 border-white shadow-cream">
                {pickupQR && (
                  <QRCode
                    value={pickupQR}
                    size={320}
                    level="M"
                    style={{ maxWidth: "100%", height: "auto", width: "100%" }}
                  />
                )}
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-linear bg-grad-sunset"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center mt-2 text-xs text-muted-foreground font-mono">
                다음 갱신까지 약 {Math.ceil((progress / 100) * 15)}초
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
