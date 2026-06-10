import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import QRCode from "react-qr-code";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { PresenterModeToggle, type PresenterMode } from "@/components/confesta/PresenterModeToggle";
import { SlideControlPanel } from "@/components/confesta/SlideControlPanel";
import { QuestionStream } from "@/components/confesta/QuestionStream";
import { ToppingWordCloud } from "@/components/confesta/ToppingWordCloud";
import { ToppingTubScene } from "@/components/confesta/ToppingTubScene";
import { AttendanceGauge } from "@/components/confesta/AttendanceGauge";
import { StageMarquee } from "@/components/confesta/StageMarquee";
import { useConfestaStore, makeAttendanceQR } from "@/lib/confesta/store";
import { SESSIONS } from "@/lib/confesta/mockData";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { usePresenterShortcuts } from "@/hooks/use-presenter-shortcuts";
import { Sparkles, MessageSquareText, Cloud, Users } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";

const searchSchema = z.object({
  mode: z.enum(["handheld", "stage"]).optional(),
});

export const Route = createFileRoute("/presenter")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "발표자 뷰 — Confesta" },
      {
        name: "description",
        content:
          "QR 출석 브로드캐스터, 슬라이드 컨트롤, 청중 질문 워드클라우드를 한 화면에서.",
      },
      { property: "og:title", content: "발표자 뷰 — Confesta" },
      {
        property: "og:description",
        content: "발표자를 위한 컨트롤 센터.",
      },
    ],
  }),
  component: PresenterView,
});

const QR_INTERVAL_MS = 15_000;

type HandheldTab = "control" | "questions" | "cloud" | "attendance";

function PresenterView() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/presenter" });
  const mode: PresenterMode = search.mode ?? "handheld";
  const setMode = (m: PresenterMode) =>
    navigate({ search: { mode: m }, replace: true });

  const [sessionId, setSessionId] = useState(SESSIONS[0].id);
  const session = SESSIONS.find((s) => s.id === sessionId)!;
  const rotate = useConfestaStore((s) => s.rotatePresenterNonce);
  const nonce = useConfestaStore((s) => s.presenterNonces[sessionId]);
  const attendanceCount = useConfestaStore(
    (s) => s.attendanceCounts[sessionId] ?? 0,
  );
  const bumpAttendance = useConfestaStore((s) => s.bumpAttendance);

  const { isFullscreen, toggle: toggleFullscreen, exit: exitFullscreen } =
    useFullscreen();
  const nextSlide = useConfestaStore((s) => s.nextSlide);
  const prevSlide = useConfestaStore((s) => s.prevSlide);

  usePresenterShortcuts({
    onNext: nextSlide,
    onPrev: prevSlide,
    onEscape: () => {
      if (isFullscreen) exitFullscreen();
    },
  });

  const [progress, setProgress] = useState(100);
  const [tab, setTab] = useState<HandheldTab>("control");

  // Force stage mode while in fullscreen
  const effectiveMode: PresenterMode = isFullscreen ? "stage" : mode;

  // Rotate nonce
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

  // Demo: organic attendance growth — small random ticks while presenting
  useEffect(() => {
    if (attendanceCount >= session.capacity) return;
    const id = window.setInterval(() => {
      const delta = Math.random() < 0.4 ? 1 : 0;
      if (delta) bumpAttendance(sessionId, delta);
    }, 3500);
    return () => window.clearInterval(id);
  }, [sessionId, session.capacity, attendanceCount, bumpAttendance]);

  const qrValue = nonce ? makeAttendanceQR(sessionId, nonce) : "";


  const modeToggle = (
    <PresenterModeToggle
      mode={mode}
      onChange={setMode}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    />
  );

  // ── STAGE MODE ────────────────────────────────────────────
  if (effectiveMode === "stage") {
    return (
      <main className="min-h-screen flex flex-col bg-background">
        {!isFullscreen && (
          <RoleHeader
            role="발표자 무대 모드"
            description={`${session.title} · ${session.room}`}
            color="blue"
            right={modeToggle}
          />
        )}

        <div
          className={`flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 px-4 sm:px-6 ${
            isFullscreen ? "pt-6" : ""
          } pb-4`}
        >
          {/* Left: huge QR + attendance */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-[2rem] p-6 sm:p-8 shadow-blue border border-white/60 flex-1 flex flex-col">
              <div className="absolute inset-0 bg-grad-cream" />
              <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
              <ToppingScatter density="med" seed="stage-qr" />
              <div className="relative flex items-center justify-between mb-3">
                <h2 className="text-xl sm:text-2xl font-extrabold bg-clip-text text-transparent bg-grad-sunset">
                  📱 지금 스캔하세요
                </h2>
                <span className="text-xs bg-grad-blueberry text-white font-bold px-2.5 py-1 rounded-full shadow-blue">
                  15초 갱신
                </span>
              </div>
              <div className="relative bg-white p-4 sm:p-6 rounded-2xl flex justify-center flex-1 items-center border-2 border-white shadow-cream">
                {qrValue && (
                  <QRCode
                    value={qrValue}
                    size={420}
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
            </div>

            <div className="relative overflow-hidden rounded-3xl p-5 shadow-cream border border-white/60 flex items-center gap-5">
              <div className="absolute inset-0 bg-grad-cream" />
              <ToppingScatter density="low" seed="stage-att" />
              <div className="relative">
                <AttendanceGauge
                  count={attendanceCount}
                  capacity={session.capacity}
                  size={140}
                />
              </div>
              <div className="relative">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                  라이브 출석
                </p>
                <p className="text-2xl font-extrabold mt-1 bg-clip-text text-transparent bg-grad-sunset">
                  {Math.round(
                    (attendanceCount / Math.max(session.capacity, 1)) * 100,
                  )}
                  % 충원
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {session.room} · 정원 {session.capacity}명
                </p>
              </div>
            </div>
          </div>

          {/* Right: word cloud */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl sm:text-2xl font-extrabold">
                TOP 토핑 키워드
              </h2>
            </div>
            <div className="flex-1">
              <ToppingTubScene sessionId={sessionId} />
            </div>
            <SlideControlPanel />
          </div>
        </div>

        {/* Bottom marquee */}
        <div className="px-4 sm:px-6 pb-4">
          <StageMarquee sessionId={sessionId} />
        </div>
      </main>
    );
  }

  // ── HANDHELD MODE ─────────────────────────────────────────
  const tabs: { value: HandheldTab; label: string; icon: React.ReactNode }[] = [
    { value: "control", label: "컨트롤", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { value: "questions", label: "질문", icon: <MessageSquareText className="w-3.5 h-3.5" /> },
    { value: "cloud", label: "워드", icon: <Cloud className="w-3.5 h-3.5" /> },
    { value: "attendance", label: "출석", icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <main className="min-h-screen pb-24">
      <RoleHeader
        role="발표자 (Presenter)"
        description="컨트롤 센터 · 핸드헬드 모드"
        color="blue"
        right={modeToggle}
      />

      <section className="px-4 sm:px-6 max-w-3xl mx-auto">
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

        {tab === "control" && (
          <div className="space-y-4 animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl p-5 shadow-blue border border-white/60">
              <div className="absolute inset-0 bg-grad-cream" />
              <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
              <ToppingScatter density="med" seed="hh-qr" />
              <div className="relative flex items-center justify-between mb-3">
                <h3 className="font-bold bg-clip-text text-transparent bg-grad-sunset">출석 QR</h3>
                <span className="text-xs bg-grad-blueberry text-white font-bold px-2.5 py-1 rounded-full shadow-blue">
                  15초마다 갱신
                </span>
              </div>
              <div className="relative bg-white p-5 rounded-2xl flex justify-center border-2 border-white shadow-cream">
                {qrValue && <QRCode value={qrValue} size={200} level="M" />}
              </div>
              <div className="relative mt-3 h-2.5 rounded-full bg-white/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-linear bg-grad-sunset"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="relative text-center mt-2 text-xs text-muted-foreground font-mono">
                다음 갱신까지 약 {Math.ceil((progress / 100) * 15)}초
              </p>
            </div>

            <SlideControlPanel />
          </div>
        )}

        {tab === "questions" && (
          <div className="animate-fade-in">
            <QuestionStream sessionId={sessionId} />
          </div>
        )}

        {tab === "cloud" && (
          <div className="animate-fade-in space-y-3">
            <p className="text-sm text-muted-foreground">
              청중 질문에서 명사 키워드만 골라 토핑처럼 통 위에 쌓입니다. 5초마다 갱신.
            </p>
            <ToppingTubScene sessionId={sessionId} compact />
          </div>
        )}

        {tab === "attendance" && (
          <div className="relative overflow-hidden animate-fade-in flex flex-col items-center gap-4 rounded-3xl p-6 border border-white/60 shadow-cream">
            <div className="absolute inset-0 bg-grad-cream" />
            <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
            <ToppingScatter density="med" seed="hh-att" />
            <div className="relative">
              <AttendanceGauge
                count={attendanceCount}
                capacity={session.capacity}
                size={220}
              />
            </div>
            <div className="relative text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                {session.room} · 정원 {session.capacity}명
              </p>
              <p className="text-3xl font-extrabold mt-1 bg-clip-text text-transparent bg-grad-sunset">
                {Math.round(
                  (attendanceCount / Math.max(session.capacity, 1)) * 100,
                )}
                %
              </p>
            </div>
            <button
              type="button"
              onClick={() => bumpAttendance(sessionId, 1)}
              className="relative bounce-press text-xs font-semibold bg-grad-blueberry text-white rounded-full px-4 py-2 shadow-blue"
            >
              +1 (데모용)
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
