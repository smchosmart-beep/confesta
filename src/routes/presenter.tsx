import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { BookmarkBar } from "@/components/confesta/BookmarkBar";
import { QuestionStream } from "@/components/confesta/QuestionStream";
import { ToppingTubScene } from "@/components/confesta/ToppingTubScene";
import { ToppingGateControl } from "@/components/confesta/ToppingGateControl";
import { SlotUnlockCard } from "@/components/confesta/SlotUnlockCard";
import { useAnswerPrompts } from "@/hooks/use-answer-prompts";
import { useToppingGate } from "@/hooks/use-topping-gate";
import { usePresenterToppings } from "@/hooks/use-toppings";
import { useSessionBootstrap } from "@/hooks/use-session-bootstrap";
import {
  issuePickupQR,
  listIssuedSlots,
  getOrderQRForPresenter,
  type IssuedSlotDTO,
} from "@/lib/confesta/slots.functions";
import { SlotQRModal } from "@/components/confesta/SlotQRModal";
import { subscribeOrders, subscribeSlots } from "@/lib/confesta/realtime-channel";
import {
  checkPresenterSlot,
  clearPresenterSlot,
} from "@/lib/confesta/presenter.functions";
import { displayRoom, makeSlotKey, PERIODS, PERIOD_LABELS, PERIOD_SHORT, type Period } from "@/lib/confesta/shared";
import { QrCode, X, LogOut, IceCream2, PieChart as PieChartIcon } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { AnswerPie } from "@/components/confesta/AnswerPie";

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
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export const Route = createFileRoute("/presenter")({
  validateSearch: zodValidator(
    z.object({
      day: z.coerce.number().int().optional().catch(undefined),
      period: z.enum(PERIODS).optional().catch(undefined),
      room: z.string().optional().catch(undefined),
    }),
  ),
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

const QR_INTERVAL_MS = 300_000;
const LAST_SLOT_KEY = "confesta:presenter:last-slot";

function PresenterPage() {
  const listFn = useServerFn(listIssuedSlots);
  const slotsQuery = useQuery({
    queryKey: ["presenter-issued-slots"],
    queryFn: () => listFn(),
    refetchInterval: 30_000,
  });
  const slots: IssuedSlotDTO[] = slotsQuery.data?.slots ?? [];

  // Realtime: refresh slot list immediately on orders/slots changes.
  const qcRT = useQueryClient();
  useEffect(() => {
    const offOrders = subscribeOrders(() =>
      qcRT.invalidateQueries({ queryKey: ["presenter-issued-slots"] }),
    );
    const offSlots = subscribeSlots(() =>
      qcRT.invalidateQueries({ queryKey: ["presenter-issued-slots"] }),
    );
    return () => {
      offOrders();
      offSlots();
    };
  }, [qcRT]);

  const search = Route.useSearch();
  const day = search.day ?? null;
  const period = search.period ?? null;
  const room = search.room ?? null;
  const navigate = useNavigate({ from: Route.fullPath });
  const setSel = (patch: {
    day?: number | null;
    period?: Period | null;
    room?: string | null;
  }) => {
    navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        ...(patch.day !== undefined ? { day: patch.day ?? undefined } : {}),
        ...(patch.period !== undefined ? { period: patch.period ?? undefined } : {}),
        ...(patch.room !== undefined ? { room: patch.room ?? undefined } : {}),
      }),
      replace: true,
    });
  };

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

  // Auto-select whenever the set changes; if URL already holds a valid combination,
  // this is a no-op. If URL is empty, prefer the last-used slot saved in localStorage
  // so a refresh restores the presenter's current session (their unlock cookie is
  // per-session, so landing on a different slot looks like a re-lock).
  useEffect(() => {
    if (slots.length === 0) {
      if (day != null || period != null || room != null) {
        setSel({ day: null, period: null, room: null });
      }
      return;
    }

    // Read last-used slot from localStorage as a fallback for empty URL params.
    let stored: { day: number; period: Period; room: string } | null = null;
    if (typeof window !== "undefined" && day == null && period == null && room == null) {
      try {
        const raw = window.localStorage.getItem(LAST_SLOT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            day?: number;
            period?: string;
            room?: string;
          };
          if (
            typeof parsed.day === "number" &&
            typeof parsed.period === "string" &&
            (PERIODS as readonly string[]).includes(parsed.period) &&
            typeof parsed.room === "string" &&
            slots.some(
              (s) =>
                s.day === parsed.day &&
                s.period === parsed.period &&
                s.room === parsed.room,
            )
          ) {
            stored = {
              day: parsed.day,
              period: parsed.period as Period,
              room: parsed.room,
            };
          }
        }
      } catch {
        // ignore malformed JSON / storage errors
      }
    }

    const seedDay = day ?? stored?.day ?? null;
    const seedPeriod = period ?? stored?.period ?? null;
    const seedRoom = room ?? stored?.room ?? null;

    const validDay =
      seedDay != null && daysAvailable.includes(seedDay) ? seedDay : daysAvailable[0];
    const periods = Array.from(
      new Set(slots.filter((s) => s.day === validDay).map((s) => s.period)),
    ) as Period[];
    const validPeriod =
      seedPeriod != null && periods.includes(seedPeriod) ? seedPeriod : periods[0];
    const rooms = slots
      .filter((s) => s.day === validDay && s.period === validPeriod)
      .map((s) => s.room);
    const validRoom =
      seedRoom != null && rooms.includes(seedRoom) ? seedRoom : rooms[0];
    if (validDay !== day || validPeriod !== period || validRoom !== room) {
      setSel({ day: validDay, period: validPeriod, room: validRoom });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  // Persist current selection so a refresh (which may drop URL params) restores it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (day != null && period != null && room != null) {
      try {
        window.localStorage.setItem(
          LAST_SLOT_KEY,
          JSON.stringify({ day, period, room }),
        );
      } catch {
        // ignore quota / privacy-mode errors
      }
    }
  }, [day, period, room]);


  const selected =
    day != null && period != null && room != null
      ? slots.find(
          (s) => s.day === day && s.period === period && s.room === room,
        ) ?? null
      : null;

  if (slots.length === 0) {
    return (
      <main className="min-h-screen pb-6">
        <RoleHeader
          role="발표자 (Flav-er)"
          description={
            slotsQuery.isLoading
              ? "세션 목록 불러오는 중…"
              : "관리자 화면에서 행사명을 입력하고 주문 QR을 발급하면 여기에 나타납니다."
          }
          color="blue"
        />
        <div className="px-3 sm:px-4">
          <div className="rounded-3xl border border-dashed border-white/80 bg-white/50 p-10 text-center text-sm text-muted-foreground">
            {slotsQuery.isLoading
              ? "세션 목록을 불러오는 중입니다…"
              : "표시할 세션이 없습니다."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-6">
      <RoleHeader
        role="발표자 (Flav-er)"
        color="blue"
        right={
          <div className="flex flex-col items-start gap-2 w-full">
            {selected && (
              <BookmarkBar
                sessionId={makeSlotKey(selected.day, selected.period, selected.room)}
              />
            )}
            <SlotPickerBar
              slots={slots}
              day={day}
              period={period}
              room={room}
              daysAvailable={daysAvailable}
              periodsAvailable={periodsAvailable}
              slotsInScope={slotsInScope}
              onChangeDay={(d) => {
                const periods = Array.from(
                  new Set(slots.filter((s) => s.day === d).map((s) => s.period)),
                ) as Period[];
                const nextPeriod =
                  period != null && periods.includes(period) ? period : periods[0] ?? null;
                const rooms = slots
                  .filter((s) => s.day === d && s.period === nextPeriod)
                  .map((s) => s.room);
                setSel({ day: d, period: nextPeriod, room: rooms[0] ?? null });
              }}
              onChangePeriod={(p) => {
                const rooms = slots
                  .filter((s) => s.day === day && s.period === p)
                  .map((s) => s.room);
                setSel({ period: p, room: rooms[0] ?? null });
              }}
              onChangeRoom={(r) => setSel({ room: r })}
              loading={slotsQuery.isLoading}
            />
          </div>
        }
      />

      <section className="px-3 sm:px-4">
        {selected ? (
          <SelectedSlotBody key={makeSlotKey(selected.day, selected.period, selected.room)} slot={selected} />
        ) : (
          <div className="rounded-3xl border border-dashed border-white/80 bg-white/50 p-10 text-center text-sm text-muted-foreground">
            세션을 선택해 주세요.
          </div>
        )}
      </section>
    </main>
  );
}

// =========================
// Slot selector bar
// =========================
function SlotPickerBar({
  slots,
  day,
  period,
  room,
  daysAvailable,
  periodsAvailable,
  slotsInScope,
  onChangeDay,
  onChangePeriod,
  onChangeRoom,
  loading,
}: {
  slots: IssuedSlotDTO[];
  day: number | null;
  period: Period | null;
  room: string | null;
  daysAvailable: number[];
  periodsAvailable: Period[];
  slotsInScope: IssuedSlotDTO[];
  onChangeDay: (d: number) => void;
  onChangePeriod: (p: Period) => void;
  onChangeRoom: (r: string) => void;
  loading: boolean;
}) {
  void slots;
  return (
    <div className="flex flex-wrap items-center gap-2 bg-card/60 border border-white/60 rounded-2xl p-2 shadow-cream w-full">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          일자
        </span>
        <Select
          value={day != null ? String(day) : ""}
          onValueChange={(v) => onChangeDay(parseInt(v, 10))}
          disabled={daysAvailable.length === 0}
        >
          <SelectTrigger className={`${selectTriggerCls} h-9 min-w-[90px] text-xs`}>
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

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          시간대
        </span>
        <Select
          value={period ?? ""}
          onValueChange={(v) => onChangePeriod(v as Period)}
          disabled={periodsAvailable.length === 0}
        >
          <SelectTrigger className={`${selectTriggerCls} h-9 min-w-[90px] text-xs`}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent className={selectContentCls}>
            {PERIODS.map((p) => (
              <SelectItem
                key={p}
                value={p}
                disabled={!periodsAvailable.includes(p)}
                className={selectItemCls}
              >
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          장소
        </span>
        <Select
          value={room ?? ""}
          onValueChange={onChangeRoom}
          disabled={slotsInScope.length === 0}
        >
          <SelectTrigger className={`${selectTriggerCls} h-9 min-w-[140px] text-xs`}>
            <SelectValue placeholder={loading ? "불러오는 중…" : "—"} />
          </SelectTrigger>
          <SelectContent className={selectContentCls}>
            {slotsInScope.map((s) => (
              <SelectItem key={s.room} value={s.room} className={selectItemCls}>
                {displayRoom(s.room)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          세션
        </span>
        <Select
          value={room ?? ""}
          onValueChange={onChangeRoom}
          disabled={!room}
        >
          <SelectTrigger className={`${selectTriggerCls} h-9 w-full text-xs`}>
            <SelectValue
              placeholder={
                loading
                  ? "불러오는 중…"
                  : !room
                    ? "장소를 먼저 선택"
                    : "세션 정보 없음"
              }
            />
          </SelectTrigger>
          <SelectContent className={selectContentCls}>
            {slotsInScope
              .filter((s) => s.room === room)
              .map((s) => (
                <SelectItem key={s.room} value={s.room} className={selectItemCls}>
                  {s.title}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

      </div>
    </div>
  );
}

// =========================
// Body — locked vs unlocked per slot
// =========================
function SelectedSlotBody({ slot }: { slot: IssuedSlotDTO }) {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkPresenterSlot);
  const clearFn = useServerFn(clearPresenterSlot);
  const sessionId = makeSlotKey(slot.day, slot.period, slot.room);

  const checkQuery = useQuery({
    queryKey: ["presenter-slot-auth", sessionId],
    queryFn: () =>
      checkFn({ data: { day: slot.day, period: slot.period, room: slot.room } }),
    staleTime: 30_000,
  });

  const lock = useMutation({
    mutationFn: () =>
      clearFn({ data: { day: slot.day, period: slot.period, room: slot.room } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["presenter-slot-auth", sessionId] }),
  });

  if (checkQuery.isLoading) {
    return (
      <div className="mt-12 text-center text-sm text-muted-foreground">
        인증 확인 중…
      </div>
    );
  }

  if (!checkQuery.data?.ok) {
    return (
      <SlotUnlockCard
        day={slot.day}
        period={slot.period}
        room={slot.room}
        title={slot.title}
        hasPresenterPassword={slot.hasPresenterPassword}
        onUnlocked={() =>
          qc.invalidateQueries({ queryKey: ["presenter-slot-auth", sessionId] })
        }
      />
    );
  }

  return (
    <UnlockedSlotView
      slot={slot}
      sessionId={sessionId}
      onLock={() => lock.mutate()}
    />
  );
}

function UnlockedSlotView({
  slot,
  sessionId,
  onLock,
}: {
  slot: IssuedSlotDTO;
  sessionId: string;
  onLock: () => void;
}) {
  const issueFn = useServerFn(issuePickupQR);
  const rotateFn = useServerFn(rotatePickupQR);
  const getOrderFn = useServerFn(getOrderQRForPresenter);

  useSessionBootstrap(sessionId);

  const [pickupOpen, setPickupOpen] = useState(false);
  const [pickupPayload, setPickupPayload] = useState<string>("");
  const [progress, setProgress] = useState(100);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderPayload, setOrderPayload] = useState<string | null>(null);

  const issue = useMutation({
    mutationFn: () =>
      issueFn({ data: { day: slot.day, period: slot.period, room: slot.room } }),
    onSuccess: (r) => setPickupPayload(r.payload),
  });
  const rotate = useMutation({
    mutationFn: () =>
      rotateFn({ data: { day: slot.day, period: slot.period, room: slot.room } }),
    onSuccess: (r) => setPickupPayload(r.payload),
  });
  const fetchOrder = useMutation({
    mutationFn: () =>
      getOrderFn({ data: { day: slot.day, period: slot.period, room: slot.room } }),
    onSuccess: (r) => setOrderPayload(r.payload),
  });

  const openOrder = () => {
    setOrderPayload(null);
    fetchOrder
      .mutateAsync()
      .then((r) => {
        if (r.payload) setOrderOpen(true);
        else alert("관리자 화면에서 아직 주문 QR이 발급되지 않았어요. 관리자에게 발급을 요청해주세요.");
      })
      .catch(() => {
        alert("주문 QR을 불러오지 못했어요.");
      });
  };

  useEffect(() => {
    if (!pickupOpen) return;
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
  }, [pickupOpen]);

  const leftColumn = (
    <div className="flex flex-col gap-3 min-h-0 h-full">
      <div className="flex items-center justify-between gap-3 bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream">
        <div className="min-w-0">
          <p className="text-2xl font-extrabold leading-tight break-words">{slot.title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openOrder}
            className="bounce-press inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl w-[88px] h-[72px] text-xs font-semibold bg-grad-blueberry text-white shadow-cream"
          >
            <QrCode className="w-5 h-5" />
            주문 QR
          </button>
          <button
            type="button"
            onClick={() => setPickupOpen(true)}
            className="bounce-press inline-flex flex-col items-center justify-center gap-1.5 rounded-2xl w-[88px] h-[72px] text-xs font-semibold bg-grad-strawberry text-white shadow-pink"
          >
            <QrCode className="w-5 h-5" />
            수령 QR
          </button>
          <button
            type="button"
            onClick={onLock}
            className="bounce-press inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
            title="이 세션 잠그기"
          >
            <LogOut className="w-3.5 h-3.5" />
            잠그기
          </button>
        </div>
      </div>

      <div className="bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream flex-1 min-h-0 max-h-[70vh] xl:max-h-none flex flex-col gap-2 overflow-hidden">

        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          토핑 키워드 (응답)
        </h2>
        <p className="text-sm text-muted-foreground">
          청중이 보낸 <strong>키워드 응답 토핑</strong>이 실시간으로 반영됩니다.
        </p>
        <div className="h-0 flex-1 flex flex-col">
          <AnswerPromptTabs sessionId={sessionId} />
        </div>
      </div>

    </div>
  );

  const rightColumn = (
    <div className="flex flex-col gap-3 min-h-0 h-full">
      <ToppingGateControl sessionId={sessionId} />
      <div className="bg-card/60 border border-white/60 rounded-2xl p-3 shadow-cream flex-1 min-h-0 basis-0 max-h-[70vh] xl:max-h-none flex flex-col gap-2 overflow-hidden">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">
          질문 목록
        </h2>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <QuestionStream sessionId={sessionId} />
        </div>
      </div>

    </div>
  );

  return (
    <>
      <ResizablePanelGroup
        orientation="horizontal"
        className="hidden xl:flex h-[calc(100vh-220px)] min-h-[600px]"
      >


        <ResizablePanel defaultSize={50} minSize={30} className="pr-2">
          {leftColumn}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={30} className="pl-2">
          {rightColumn}
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="xl:hidden flex flex-col gap-4">
        {leftColumn}
        {rightColumn}
      </div>



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
                  5분마다 갱신
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
                다음 갱신까지 약 {Math.ceil((progress / 100) * 300)}초
              </p>
            </div>
          </div>
        </div>
      )}

      <SlotQRModal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title={slot.title}
        subtitle={`Day ${slot.day} · ${PERIOD_SHORT[slot.period]} · ${displayRoom(slot.room)}`}
        payload={orderPayload ?? ""}
      />
    </>
  );
}

// =========================
// Answer-prompt picker tabs + filtered scene
// =========================
function AnswerPromptTabs({ sessionId }: { sessionId: string }) {
  const { prompts } = useAnswerPrompts(sessionId);
  const { gate } = useToppingGate(sessionId);
  const { toppings } = usePresenterToppings(sessionId);

  const sorted = useMemo(
    () => [...prompts].sort((a, b) => b.createdAt - a.createdAt),
    [prompts],
  );
  const activeId = gate.activePromptId ?? null;
  const fallbackId = activeId ?? sorted[0]?.id ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(fallbackId);
  const [userPicked, setUserPicked] = useState(false);
  const [view, setView] = useState<"tub" | "chart">("tub");


  // Sync: follow active until user picks; reset if picked one disappears.
  useEffect(() => {
    if (sorted.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      if (userPicked) setUserPicked(false);
      return;
    }
    if (!userPicked) {
      if (selectedId !== fallbackId) setSelectedId(fallbackId);
      return;
    }
    const stillExists = sorted.some((p) => p.id === selectedId);
    if (!stillExists) {
      setUserPicked(false);
      setSelectedId(fallbackId);
    }
  }, [sorted, fallbackId, userPicked, selectedId]);

  // Answer counts per prompt.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of toppings) {
      if (t.kind !== "answer" || !t.promptId) continue;
      m.set(t.promptId, (m.get(t.promptId) ?? 0) + 1);
    }
    return m;
  }, [toppings]);

  return (
    <>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {sorted.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1 min-w-0">
            {sorted.map((p) => {
              const isSelected = p.id === selectedId;
              const isActive = p.id === activeId;
              const c = counts.get(p.id) ?? 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    setUserPicked(true);
                  }}
                  title={p.text}
                  className={`bounce-press shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border transition ${
                    isSelected
                      ? "bg-grad-strawberry text-white border-white shadow-pink"
                      : "bg-white/80 text-foreground border-white/60 hover:bg-white"
                  }`}
                >
                  {isActive && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-rose-500"
                      }`}
                      aria-label="라이브"
                    />
                  )}
                  <span className="max-w-[160px] truncate">{p.text}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 rounded-full ${
                      isSelected ? "bg-white/25" : "bg-black/5 text-muted-foreground"
                    }`}
                  >
                    {c}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <div className="inline-flex p-1 bg-card/80 backdrop-blur rounded-full shadow-cream border border-white/60 shrink-0">
          <button
            type="button"
            onClick={() => setView("tub")}
            className={`bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              view === "tub"
                ? "bg-grad-strawberry text-white shadow-pink"
                : "text-foreground/70"
            }`}
            aria-label="토핑 보기"
          >
            <IceCream2 className="w-3.5 h-3.5" /> 토핑
          </button>
          <button
            type="button"
            onClick={() => setView("chart")}
            disabled={sorted.length === 0}
            className={`bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
              view === "chart"
                ? "bg-grad-blueberry text-white shadow-blue"
                : "text-foreground/70"
            }`}
            aria-label="통계 보기"
          >
            <PieChartIcon className="w-3.5 h-3.5" /> 통계
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {view === "tub" ? (
          <ToppingTubScene
            sessionId={sessionId}
            promptId={selectedId}
            promptsCount={sorted.length}
          />
        ) : (
          <AnswerPie sessionId={sessionId} promptId={selectedId} />
        )}
      </div>
    </>
  );
}


