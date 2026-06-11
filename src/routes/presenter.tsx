import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { QuestionStream } from "@/components/confesta/QuestionStream";
import { ToppingTubScene } from "@/components/confesta/ToppingTubScene";
import { ToppingGateControl } from "@/components/confesta/ToppingGateControl";
import { PinAuthGate } from "@/components/confesta/PinAuthGate";
import {
  issuePickupQR,
  listIssuedSlots,
  rotatePickupQR,
  type IssuedSlotDTO,
} from "@/lib/confesta/slots.functions";
import { makeSlotKey, type Period } from "@/lib/confesta/shared";
import { QrCode, X } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  selectTriggerCls,
  selectContentCls,
  selectItemCls,
} from "@/lib/confesta/selectStyles";

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
  component: PresenterPage,
});

function PresenterPage() {
  return (
    <PinAuthGate
      role="presenter"
      title="발표자 인증"
      description="청중 입력 제어 · 수령 QR 발급을 위해 인증이 필요해요."
      accent="strawberry"
    >
      <PresenterView />
    </PinAuthGate>
  );
}

const QR_INTERVAL_MS = 15_000;

function PresenterView() {
  const listFn = useServerFn(listIssuedSlots);
  const slotsQuery = useQuery({
    queryKey: ["presenter-issued-slots"],
    queryFn: () => listFn(),
    refetchInterval: 10_000,
  });
  const slots: IssuedSlotDTO[] = slotsQuery.data?.slots ?? [];

  const [day, setDay] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const [room, setRoom] = useState<string | null>(null);

  const daysAvailable = useMemo(
    () => Array.from(new Set(slots.map((s) => s.day))).sort((a, b) => a - b),
    [slots],
  );
  const periodsAvailable = useMemo(
    () =>
      Array.from(
        new Set(slots.filter((s) => s.day === day).map((s) => s.period)),
      ) as Period[],
    [slots, day],
  );
  const slotsInScope = useMemo(
    () => slots.filter((s) => s.day === day && s.period === period),
    [slots, day, period],
  );

  // Auto-select first available slot whenever the set changes
  useEffect(() => {
    if (slots.length === 0) {
      setDay(null);
      setPeriod(null);
      setRoom(null);
      return;
    }
    const validDay = day != null && daysAvailable.includes(day) ? day : daysAvailable[0];
    const periods = Array.from(
      new Set(slots.filter((s) => s.day === validDay).map((s) => s.period)),
    ) as Period[];
    const validPeriod =
      period != null && periods.includes(period) ? period : periods[0];
    const rooms = slots
      .filter((s) => s.day === validDay && s.period === validPeriod)
      .map((s) => s.room);
    const validRoom = room != null && rooms.includes(room) ? room : rooms[0];
    if (validDay !== day) setDay(validDay);
    if (validPeriod !== period) setPeriod(validPeriod);
    if (validRoom !== room) setRoom(validRoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const selected =
    day != null && period != null && room != null
      ? slots.find(
          (s) => s.day === day && s.period === period && s.room === room,
        ) ?? null
      : null;
  const sessionId = selected
    ? makeSlotKey(selected.day, selected.period, selected.room)
    : null;

  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupPayload, setPickupPayload] = useState<string>("");
  const [progress, setProgress] = useState(100);

  const issueFn = useServerFn(issuePickupQR);
  const rotateFn = useServerFn(rotatePickupQR);

  const issue = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("세션이 선택되지 않았어요");
      return issueFn({
        data: { day: selected.day, period: selected.period, room: selected.room },
      });
    },
    onSuccess: (r) => setPickupPayload(r.payload),
  });
  const rotate = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("세션이 선택되지 않았어요");
      return rotateFn({
        data: { day: selected.day, period: selected.period, room: selected.room },
      });
    },
    onSuccess: (r) => setPickupPayload(r.payload),
  });

  // Reset pickup modal when session changes
  useEffect(() => {
    setPickupOpen(false);
    setPickupPayload("");
  }, [sessionId]);

  // While modal open, issue once and rotate every interval
  useEffect(() => {
    if (!pickupOpen || !selected) return;
    issue.mutate();
    setProgress(100);
    const start = Date.now();
    const tickId = window.setInterval(() => {
      const elapsed = (Date.now() - start) % QR_INTERVAL_MS;
      setProgress(100 - (elapsed / QR_INTERVAL_MS) * 100);
    }, 100);
    const rotateId = window.setInterval(() => {
      rotate.mutate();
    }, QR_INTERVAL_MS);
    return () => {
      window.clearInterval(tickId);
      window.clearInterval(rotateId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, pickupOpen]);

  const headerDesc = selected
    ? `${selected.title} · ${selected.room}`
    : slotsQuery.isLoading
    ? "세션 목록 불러오는 중…"
    : "관리자 화면에서 행사명을 입력하고 주문 QR을 발급하면 여기에 나타납니다.";

  return (
    <main className="min-h-screen pb-6">
      <RoleHeader
        role="발표자 (Presenter)"
        description={headerDesc}
        color="blue"
      />

      <section className="px-3 sm:px-4">
        <div className="mb-4 flex flex-col gap-3 bg-card/60 border border-white/60 rounded-3xl p-4 shadow-cream">
          <div className="flex items-start justify-between gap-3">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_2fr] gap-4 flex-1">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  1단계 · 일자 선택
                </span>
                <Select
                  value={day != null ? String(day) : ""}
                  onValueChange={(v) => {
                    const d = parseInt(v, 10);
                    setDay(d);
                    const periods = Array.from(
                      new Set(
                        slots.filter((s) => s.day === d).map((s) => s.period),
                      ),
                    ) as Period[];
                    const nextPeriod =
                      period != null && periods.includes(period)
                        ? period
                        : periods[0] ?? null;
                    setPeriod(nextPeriod);
                    const rooms = slots
                      .filter((s) => s.day === d && s.period === nextPeriod)
                      .map((s) => s.room);
                    setRoom(rooms[0] ?? null);
                  }}
                  disabled={daysAvailable.length === 0}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {daysAvailable.map((d) => (
                      <SelectItem key={d} value={String(d)} className={selectItemCls}>
                        Day {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  2단계 · 시간대 선택
                </span>
                <Select
                  value={period ?? ""}
                  onValueChange={(v) => {
                    const p = v as Period;
                    setPeriod(p);
                    const rooms = slots
                      .filter((s) => s.day === day && s.period === p)
                      .map((s) => s.room);
                    setRoom(rooms[0] ?? null);
                  }}
                  disabled={periodsAvailable.length === 0}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {(["am", "pm"] as const).map((p) => (
                      <SelectItem
                        key={p}
                        value={p}
                        disabled={!periodsAvailable.includes(p)}
                        className={selectItemCls}
                      >
                        {p === "am" ? "오전" : "오후"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  3단계 · 세션 선택
                </span>
                <Select
                  value={room ?? ""}
                  onValueChange={(v) => setRoom(v)}
                  disabled={slotsInScope.length === 0}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue
                      placeholder={
                        slotsQuery.isLoading
                          ? "불러오는 중…"
                          : "발급된 세션이 없습니다"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {slotsInScope.map((s) => (
                      <SelectItem key={s.room} value={s.room} className={selectItemCls}>
                        {s.room} — {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPickupOpen(true)}
              disabled={!selected}
              className="bounce-press inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl w-[88px] h-[88px] text-xs font-semibold bg-grad-strawberry text-white shadow-pink shrink-0 disabled:opacity-40 disabled:hover:scale-100"
            >
              <QrCode className="w-5 h-5" />
              수령 QR
            </button>
          </div>
        </div>

        {sessionId ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 h-[calc(100vh-180px)]">
            <div className="space-y-2 flex flex-col h-full">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                토핑 키워드 (응답)
              </h2>
              <ToppingGateControl sessionId={sessionId} />
              <p className="text-sm text-muted-foreground">
                청중이 보낸 <strong>키워드 응답</strong>이 토핑처럼 통 위로 내려옵니다. 5초마다 갱신.
              </p>
              <div className="flex-1 min-h-0">
                <ToppingTubScene sessionId={sessionId} />
              </div>
            </div>

            <div className="space-y-2 flex flex-col h-full overflow-hidden">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                질문 목록
              </h2>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <QuestionStream sessionId={sessionId} />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/80 bg-white/50 p-10 text-center text-sm text-muted-foreground">
            {slotsQuery.isLoading
              ? "세션 목록을 불러오는 중입니다…"
              : "표시할 세션이 없습니다. 관리자 화면에서 행사명을 입력하고 주문 QR을 발급해 주세요."}
          </div>
        )}
      </section>

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
                {pickupPayload ? (
                  <QRCode
                    value={pickupPayload}
                    size={320}
                    level="M"
                    style={{ maxWidth: "100%", height: "auto", width: "100%" }}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground py-12">발급 중…</div>
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
