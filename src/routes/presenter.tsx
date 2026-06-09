import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { useConfestaStore, makeAttendanceQR } from "@/lib/confesta/store";
import { SESSIONS, getCategory } from "@/lib/confesta/mockData";
import { Pin, Check } from "lucide-react";

export const Route = createFileRoute("/presenter")({
  head: () => ({
    meta: [
      { title: "발표자 뷰 — Confesta" },
      {
        name: "description",
        content:
          "동적 QR을 15초마다 갱신하며 청중의 출석을 인증하고, 라이브 토핑 질문을 한눈에 확인하세요.",
      },
      { property: "og:title", content: "발표자 뷰 — Confesta" },
      {
        property: "og:description",
        content: "동적 QR 브로드캐스터와 실시간 질문 피드.",
      },
    ],
  }),
  component: PresenterView,
});

const QR_INTERVAL_MS = 15_000;

function PresenterView() {
  const [sessionId, setSessionId] = useState(SESSIONS[0].id);
  const session = SESSIONS.find((s) => s.id === sessionId)!;
  const rotate = useConfestaStore((s) => s.rotatePresenterNonce);
  const nonce = useConfestaStore((s) => s.presenterNonces[sessionId]);
  const toppings = useConfestaStore((s) =>
    s.toppings.filter((t) => t.sessionId === sessionId),
  );
  const togglePin = useConfestaStore((s) => s.togglePinTopping);
  const toggleAddressed = useConfestaStore((s) => s.toggleAddressedTopping);

  const [progress, setProgress] = useState(100);

  // Rotate nonce every QR_INTERVAL_MS
  useEffect(() => {
    rotate(sessionId);
    setProgress(100);
    const start = Date.now();
    const tickId = window.setInterval(() => {
      const elapsed = (Date.now() - start) % QR_INTERVAL_MS;
      setProgress(100 - (elapsed / QR_INTERVAL_MS) * 100);
    }, 100);
    const rotateId = window.setInterval(() => {
      rotate(sessionId);
    }, QR_INTERVAL_MS);
    return () => {
      window.clearInterval(tickId);
      window.clearInterval(rotateId);
    };
  }, [sessionId, rotate]);

  const qrValue = nonce ? makeAttendanceQR(sessionId, nonce) : "";

  const barColor = `oklch(${0.7 - (1 - progress / 100) * 0.1} ${0.18 + (1 - progress / 100) * 0.1} ${235 - (1 - progress / 100) * 235})`;

  const sortedToppings = [...toppings].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt - a.createdAt;
  });

  const CANDY_COLORS = [
    "var(--scoop-strawberry)",
    "var(--scoop-mint)",
    "var(--scoop-mango)",
    "var(--scoop-blueberry)",
  ];

  return (
    <main className="min-h-screen pb-16">
      <RoleHeader
        role="발표자 (Presenter)"
        description="QR 갱신 + 실시간 질문 피드"
        color="blue"
      />

      <section className="px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="mb-4">
          <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">
            세션 선택
          </label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full bg-card border border-border rounded-full px-4 py-2.5 text-sm font-semibold outline-none"
          >
            {SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                Day {s.day} · {s.timeSlot} · {s.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* QR Broadcaster */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-3xl p-6 shadow-blue border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">출석 QR</h3>
                <span className="text-xs bg-secondary/10 text-secondary font-bold px-2.5 py-1 rounded-full">
                  15초마다 갱신
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {session.room} · {session.timeSlot}
              </p>
              <div className="bg-white p-6 rounded-2xl flex justify-center">
                {qrValue && <QRCode value={qrValue} size={240} level="M" />}
              </div>

              <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress}%`, backgroundColor: barColor }}
                />
              </div>
              <p className="text-center mt-2 text-xs text-muted-foreground font-mono">
                다음 갱신까지 약 {Math.ceil((progress / 100) * 15)}초
              </p>
            </div>
          </div>

          {/* Topping feed */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">토핑 질문 피드</h3>
              <span className="text-xs text-muted-foreground">
                {sortedToppings.length}개
              </span>
            </div>
            {sortedToppings.length === 0 ? (
              <div className="bg-card rounded-3xl p-10 text-center text-muted-foreground border border-border">
                아직 도착한 토핑이 없습니다.
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 gap-4 [column-fill:_balance]">
                {sortedToppings.map((t, i) => {
                  const cat = getCategory(session.category);
                  const color = CANDY_COLORS[i % CANDY_COLORS.length];
                  return (
                    <div
                      key={t.id}
                      className={`mb-4 break-inside-avoid rounded-2xl p-4 shadow-cream border-2 ${
                        t.addressed ? "opacity-60 line-through" : ""
                      } ${t.pinned ? "ring-4 ring-primary/30" : ""}`}
                      style={{
                        backgroundColor: color,
                        borderColor: "rgba(255,255,255,0.7)",
                      }}
                    >
                      <p className="text-sm text-foreground/90 font-medium">
                        {t.text}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-foreground/60">
                          {new Date(t.createdAt).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" · "}
                          {cat.label}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => togglePin(t.id)}
                            className="bounce-press bg-white/70 hover:bg-white rounded-full p-1.5"
                            aria-label="상단 고정"
                          >
                            <Pin className={`w-3.5 h-3.5 ${t.pinned ? "fill-current" : ""}`} />
                          </button>
                          <button
                            onClick={() => toggleAddressed(t.id)}
                            className="bounce-press bg-white/70 hover:bg-white rounded-full p-1.5"
                            aria-label="답변 완료"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
