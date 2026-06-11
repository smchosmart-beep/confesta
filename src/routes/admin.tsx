import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QrCode, Plus } from "lucide-react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { AdminAuthGate } from "@/components/confesta/AdminAuthGate";
import { SlotQRModal } from "@/components/confesta/SlotQRModal";
import { SESSIONS, VENUES } from "@/lib/confesta/mockData";
import { makeSlotKey } from "@/lib/confesta/shared";
import { useConfestaStore } from "@/lib/confesta/store";
import {
  listSlots,
  upsertSlotTitle,
  issueOrderQR,
  rotateOrderQR,
  type SlotDTO,
} from "@/lib/confesta/slots.functions";
import { setSlotPresenterPassword } from "@/lib/confesta/presenter.functions";
import { toast } from "sonner";
import { KeyRound, Check, X as XIcon } from "lucide-react";
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

type Period = "am" | "pm";
const periodOf = (s: { timeSlot: string }): Period =>
  parseInt(s.timeSlot.slice(0, 2), 10) < 12 ? "am" : "pm";



export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "관리자 대시보드 — Confesta" },
      {
        name: "description",
        content:
          "LEWEST 4층 행사 공간별 주문(등록) QR · 수령(출석) QR 스캔 수를 평면도 형태로 한눈에 보여주는 운영 대시보드.",
      },
      { property: "og:title", content: "관리자 대시보드 — Confesta" },
      {
        property: "og:description",
        content: "장소별 주문 QR · 수령 QR 스캔 집계 (평면도 배치).",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <AdminAuthGate>
      <AdminView />
    </AdminAuthGate>
  );
}


interface SubStat {
  code: string; // "A"/"B"/...
  label: string; // e.g. "401-A"
  orders: number;
  pickups: number;
  capacity: number;
  sessionTitle?: string;
  toppings: number;
}

interface VenueStat {
  id: string;
  name: string;
  area: string;
  subs: SubStat[];
  totalOrders: number;
  totalPickups: number;
  noMetrics?: boolean;
}


function AdminView() {
  const orders = useConfestaStore((s) => s.orders);
  const scoops = useConfestaStore((s) => s.scoops);
  const toppings = useConfestaStore((s) => s.toppings);

  const daysAvailable = useMemo(
    () => Array.from(new Set(SESSIONS.map((s) => s.day))).sort(),
    [],
  );
  const [selectedDay, setSelectedDay] = useState<number>(
    daysAvailable[0] ?? 1,
  );
  const periodsAvailable = useMemo(
    () =>
      Array.from(
        new Set(
          SESSIONS.filter((s) => s.day === selectedDay).map(periodOf),
        ),
      ) as Period[],
    [selectedDay],
  );
  const [selectedPeriod, setSelectedPeriod] = useState<Period>(
    (periodsAvailable[0] ?? "am") as Period,
  );
  // 일자 변경 시 현재 시간대가 없으면 첫 시간대로 보정
  if (!periodsAvailable.includes(selectedPeriod) && periodsAvailable[0]) {
    queueMicrotask(() => setSelectedPeriod(periodsAvailable[0]));
  }

  // Server-backed slot data for the selected day/period
  const listSlotsFn = useServerFn(listSlots);
  const slotsQuery = useQuery({
    queryKey: ["admin-slots", selectedDay, selectedPeriod],
    queryFn: () => listSlotsFn({ data: { day: selectedDay, period: selectedPeriod } }),
  });
  const slotsByRoom = useMemo(() => {
    const m = new Map<string, SlotDTO>();
    for (const s of slotsQuery.data?.slots ?? []) m.set(s.room, s);
    return m;
  }, [slotsQuery.data]);


  const stats: VenueStat[] = useMemo(() => {
    return VENUES.map((v) => {
      if (v.noMetrics) {
        return {
          id: v.id,
          name: v.name,
          area: v.area,
          subs: [],
          totalOrders: 0,
          totalPickups: 0,
          noMetrics: true,
        };
      }
      const codes = v.subspaces.length ? v.subspaces : [""];
      const subs: SubStat[] = codes.map((code) => {
        const roomLabel = v.id === "hall"
          ? `LEWEST Hall${code ? " " + code : ""}`
          : code
            ? `${v.id}-${code}`
            : v.id;
        const session = SESSIONS.find(
          (s) =>
            s.room === roomLabel &&
            s.day === selectedDay &&
            periodOf(s) === selectedPeriod,
        );


        const slotKey = makeSlotKey(selectedDay, selectedPeriod, roomLabel);
        const ord = orders.filter((o) => o.sessionId === slotKey).length;
        const pickRaw = scoops.filter((sc) => sc.sessionId === slotKey).length;
        const pick = Math.min(pickRaw, ord);
        const tops = toppings.filter((t) => t.sessionId === slotKey).length;

        return {
          code: code || "—",
          label: roomLabel,
          orders: ord,
          pickups: pick,
          capacity: session?.capacity ?? 30,
          sessionTitle: session?.title,
          toppings: tops,
        };


      });

      const totalOrders = subs.reduce((a, b) => a + b.orders, 0);
      const totalPickups = subs.reduce((a, b) => a + b.pickups, 0);
      return {
        id: v.id,
        name: v.name,
        area: v.area,
        subs,
        totalOrders,
        totalPickups,
      };
    });
  }, [orders, scoops, toppings, selectedDay, selectedPeriod]);



  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, v) => ({
          orders: acc.orders + v.totalOrders,
          pickups: acc.pickups + v.totalPickups,
        }),
        { orders: 0, pickups: 0 },
      ),
    [stats],
  );

  return (
    <main className="min-h-screen pb-16">
      <RoleHeader
        role="관리자 (Admin)"
        description="LEWEST 4층 평면도 · 공간별 주문(등록) QR · 수령(출석) QR 실시간 집계"
        color="mango"
      />

      <section className="px-4 sm:px-6 max-w-[1500px] mx-auto">
        {/* 전체 합계 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          <TotalCard
            label="주문 (등록) QR 스캔"
            sublabel="Order QR · 신청자 수"
            value={totals.orders}
            grad="bg-grad-blueberry"
          />
          <TotalCard
            label="수령 (출석) QR 스캔"
            sublabel="Pickup QR · 실제 수령자 수"
            value={totals.pickups}
            grad="bg-grad-strawberry"
          />
        </div>

        {/* 평면도 배치 */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider">
            행사 공간 배치도 (LEWEST 4F)
          </h2>
          <div className="flex items-center gap-3 text-[11px] font-bold">
            <Legend color="bg-grad-blueberry" label="주문 QR" />
            <Legend color="bg-grad-strawberry" label="수령 QR" />
          </div>
        </div>

        {/* Day / 시간대 필터 */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-card/60 border border-white/60 rounded-2xl p-3 sm:p-4 shadow-cream">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              1단계 · 일자 선택
            </span>
            <Select
              value={String(selectedDay)}
              onValueChange={(v) => setSelectedDay(parseInt(v, 10))}
            >
              <SelectTrigger className={selectTriggerCls}>
                <SelectValue />
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
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              2단계 · 시간대 선택
            </span>
            <Select
              value={selectedPeriod}
              onValueChange={(v) => setSelectedPeriod(v as Period)}
            >
              <SelectTrigger className={selectTriggerCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentCls}>
                {periodsAvailable.map((p) => (
                  <SelectItem key={p} value={p} className={selectItemCls}>
                    {p === "am" ? "오전" : "오후"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* 데스크톱: 평면도 배치 (md 이상에서만) */}
        <div className="hidden md:grid gap-3 sm:gap-4 p-1 sm:p-1.5 rounded-3xl border border-white/60 bg-grad-aurora-soft/30 shadow-cream grid-cols-[0.9fr_2.2fr_0.9fr] items-start">
          {/* 좌측 컬럼: 402 (위) / 401 (아래) + 400 VIP */}
          <div className="flex flex-col gap-24 self-stretch">
            {stats.filter((v) => v.id === "402").map((v) => <VenueCard key={v.id} venue={v} day={selectedDay} period={selectedPeriod} slotsByRoom={slotsByRoom} />)}
            {stats.filter((v) => v.id === "401").map((v) => <VenueCard key={v.id} venue={v} day={selectedDay} period={selectedPeriod} slotsByRoom={slotsByRoom} />)}
            {stats.filter((v) => v.id === "400").map((v) => <VenueCard key={v.id} venue={v} day={selectedDay} period={selectedPeriod} slotsByRoom={slotsByRoom} />)}
          </div>
          {/* 중앙 컬럼: LEWEST Hall */}
          <div className="flex flex-col self-stretch pt-[404px]">
            {stats.filter((v) => v.id === "hall").map((v) => <VenueCard key={v.id} venue={v} day={selectedDay} period={selectedPeriod} slotsByRoom={slotsByRoom} />)}
          </div>
          {/* 우측 컬럼: 403 (위) / 404 (아래) */}
          <div className="flex flex-col gap-24 self-stretch">
            {stats.filter((v) => v.id === "403").map((v) => <VenueCard key={v.id} venue={v} day={selectedDay} period={selectedPeriod} slotsByRoom={slotsByRoom} />)}
            {stats.filter((v) => v.id === "404").map((v) => <VenueCard key={v.id} venue={v} day={selectedDay} period={selectedPeriod} slotsByRoom={slotsByRoom} />)}
          </div>
        </div>

        {/* 모바일: 세로 스택 리스트 (md 미만에서만) */}
        <div className="md:hidden flex flex-col gap-3">
          {["402", "401", "hall", "403", "404", "400"].flatMap((id) =>
            stats.filter((v) => v.id === id).map((v) => (
              <MobileVenueCard key={v.id} venue={v} day={selectedDay} period={selectedPeriod} slotsByRoom={slotsByRoom} />
            )),
          )}
        </div>


        <div className="mt-6 text-xs text-muted-foreground bg-muted/50 rounded-2xl p-4">
          ※ 카드 위치는 LEWEST 4층 평면도를 기반으로 배치되어 있습니다. 각
          카드의 숫자는 데모 베이스라인 + 현재 브라우저의 실시간 스캔 활동을
          합산한 값입니다.
        </div>

      </section>
    </main>
  );
}

/** 실제 평면도 배치를 반영한 서브공간 그리드 스타일 */
function subGridStyle(venueId: string): React.CSSProperties {
  // 401~404: 모든 서브공간 타일을 동일한 최소 높이로 (콘텐츠가 많으면 자연스럽게 확장)
  const tileRow = "minmax(208px, auto)";
  switch (venueId) {
    case "401":
      // 위→아래: D, C, B, A (세로 1열)
      return {
        gridTemplateColumns: "1fr",
        gridAutoRows: tileRow,
        gridTemplateAreas: `"d" "c" "b" "a"`,
      };
    case "402":
      // 위→아래: B, A
      return {
        gridTemplateColumns: "1fr",
        gridAutoRows: tileRow,
        gridTemplateAreas: `"b" "a"`,
      };
    case "403":
    case "404":
      // 위→아래: C, B, A
      return {
        gridTemplateColumns: "1fr",
        gridAutoRows: tileRow,
        gridTemplateAreas: `"c" "b" "a"`,
      };
    case "hall":
      // 2행 2열 — 1행: C | A,  2행: B | A  (A는 두 행 모두 차지 → B+C 세로 = A 세로)
      return {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "270px 486px",
        gridTemplateAreas: `"c a" "b a"`,
      };
    default:
      return { gridTemplateColumns: "1fr" };
  }
}

// =========================
// Slot Title Input
// =========================
function SlotTitleInput({
  day,
  period,
  room,
  initial,
  placeholder,
}: {
  day: number;
  period: Period;
  room: string;
  initial: string;
  placeholder?: string;
}) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertSlotTitle);
  const [value, setValue] = useState(initial);
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  const save = useMutation({
    mutationFn: (title: string) =>
      upsertFn({ data: { day, period, room, title } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-slots", day, period] }),
  });

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) save.mutate(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      placeholder={placeholder ?? "행사명 입력"}
      className="w-full rounded-md border border-foreground/15 bg-white/80 px-2 py-1 text-sm font-semibold text-foreground/90 leading-tight outline-none focus:border-primary text-center"
      maxLength={80}
    />
  );
}

// =========================
// Presenter password input
// =========================
function SlotPresenterPasswordInput({
  day,
  period,
  room,
  hasPassword,
  compact,
}: {
  day: number;
  period: Period;
  room: string;
  hasPassword: boolean;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(setSlotPresenterPassword);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const save = useMutation({
    mutationFn: (password: string) =>
      saveFn({ data: { day, period, room, password } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(("message" in res && res.message) || "저장 실패");
        return;
      }
      toast.success(res.cleared ? "비밀번호 해제됨" : "비밀번호 저장됨");
      setEditing(false);
      setValue("");
      qc.invalidateQueries({ queryKey: ["admin-slots", day, period] });
    },
    onError: () => toast.error("저장 중 오류"),
  });

  const sizeCls = compact ? "text-[10px] py-1 px-2" : "text-[11px] py-1 px-2";

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-1.5 rounded-md border border-dashed border-foreground/15 bg-white/50 px-2 py-1">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
          <KeyRound className="w-3 h-3" />
          {hasPassword ? (
            <span className="text-emerald-700">● 설정됨</span>
          ) : (
            <span className="text-amber-700">미설정</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`bounce-press rounded-md bg-foreground/10 hover:bg-foreground/15 text-foreground font-extrabold whitespace-nowrap ${sizeCls}`}
          >
            {hasPassword ? "변경" : "설정"}
          </button>
          {hasPassword && (
            <button
              type="button"
              onClick={() => {
                if (confirm("발표자 비밀번호를 해제할까요?")) save.mutate("");
              }}
              disabled={save.isPending}
              className={`bounce-press rounded-md bg-white/80 border border-foreground/15 text-muted-foreground hover:text-red-600 font-extrabold whitespace-nowrap ${sizeCls} disabled:opacity-40`}
            >
              해제
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        save.mutate(value);
      }}
      className="flex items-center gap-1"
    >
      <input
        type="password"
        autoFocus
        autoComplete="new-password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="6자 이상, 공백 없이"
        maxLength={64}
        className="flex-1 min-w-0 rounded-md border border-foreground/15 bg-white/90 px-2 py-1 text-xs outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={!value.trim() || save.isPending}
        className="bounce-press rounded-md bg-grad-strawberry text-white w-7 h-7 flex items-center justify-center shadow-pink disabled:opacity-40"
        aria-label="저장"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setValue("");
        }}
        className="bounce-press rounded-md bg-white/80 border border-foreground/15 text-muted-foreground w-7 h-7 flex items-center justify-center"
        aria-label="취소"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}


function SlotQRControls({
  day,
  period,
  room,
  slot,
  labelForModal,
  compact,
}: {
  day: number;
  period: Period;
  room: string;
  slot: SlotDTO | undefined;
  labelForModal: string;
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const issueFn = useServerFn(issueOrderQR);
  const rotateFn = useServerFn(rotateOrderQR);
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<string | null>(slot?.orderPayload ?? null);

  useEffect(() => {
    setPayload(slot?.orderPayload ?? null);
  }, [slot?.orderPayload]);

  const issue = useMutation({
    mutationFn: () => issueFn({ data: { day, period, room } }),
    onSuccess: (res) => {
      setPayload(res.payload);
      setOpen(true);
      qc.invalidateQueries({ queryKey: ["admin-slots", day, period] });
    },
  });

  const rotate = useMutation({
    mutationFn: () => rotateFn({ data: { day, period, room } }),
    onSuccess: (res) => {
      setPayload(res.payload);
      qc.invalidateQueries({ queryKey: ["admin-slots", day, period] });
    },
  });

  const hasQR = !!slot?.hasOrderQR;
  const btnSize = compact ? "text-[10px] px-2 py-0.5" : "text-[11px] px-2.5 py-1";

  return (
    <>
      {hasQR ? (
        <button
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 rounded-md bg-grad-blueberry text-white font-extrabold shadow-cream whitespace-nowrap ${btnSize}`}
        >
          <QrCode className="w-3 h-3" />
          QR 보기
        </button>
      ) : (
        <button
          onClick={() => issue.mutate()}
          disabled={issue.isPending}
          className={`inline-flex items-center gap-1 rounded-md bg-foreground/10 hover:bg-foreground/15 text-foreground font-extrabold whitespace-nowrap disabled:opacity-40 ${btnSize}`}
        >
          <Plus className="w-3 h-3" />
          {issue.isPending ? "발급 중…" : "QR 발급"}
        </button>
      )}

      <SlotQRModal
        open={open && !!payload}
        onClose={() => setOpen(false)}
        title={labelForModal}
        subtitle={`Day ${day} · ${period === "am" ? "오전" : "오후"} · ${room}`}
        payload={payload ?? ""}
        onRotate={() => {
          if (confirm("기존 QR을 무효화하고 새로 발급합니다. 계속할까요?")) {
            rotate.mutate();
          }
        }}
        rotating={rotate.isPending}
      />
    </>
  );
}



function VenueCard({
  venue,
  day,
  period,
  slotsByRoom,
}: {
  venue: VenueStat;
  day: number;
  period: Period;
  slotsByRoom: Map<string, SlotDTO>;
}) {
  return (
    <div
      className="relative overflow-hidden bg-card rounded-2xl p-3 shadow-cream border border-white/70 flex flex-col"
      style={{ gridArea: venue.area }}
    >
      <ToppingScatter density="low" seed={`v-${venue.id}`} />
      <div className="relative flex items-baseline justify-between mb-2">
        <h3 className="font-extrabold text-base sm:text-lg leading-none">
          {venue.name}
        </h3>
        {!venue.noMetrics && (
          <span className="text-[10px] font-bold text-muted-foreground">
            {venue.subs.length} 공간
          </span>
        )}
      </div>

      {venue.noMetrics ? (
        <div className="relative flex-1 flex items-center justify-center text-center text-[11px] text-muted-foreground py-4">
          주문/수령 집계 없음
        </div>
      ) : (
        <>

      {/* 서브 공간 그리드 (평면도 실제 배치 반영) */}
      <div
        className="relative grid gap-1.5 mt-auto flex-1 p-1.5 rounded-xl bg-muted/40 border border-dashed border-foreground/15"
        style={subGridStyle(venue.id)}
      >
      {venue.subs.map((sub) => {
          const pct = sub.orders > 0 ? Math.min(100, Math.round((sub.pickups / sub.orders) * 100)) : 0;
          const isHall = venue.id === "hall";
          const chartSize = isHall
            ? sub.code === "A" ? 140 : sub.code === "B" ? 110 : 80
            : 64;
          const chartInset = isHall
            ? sub.code === "A" ? "inset-3" : sub.code === "B" ? "inset-2.5" : "inset-2"
            : "inset-1.5";
          const chartText = isHall
            ? sub.code === "A" ? "text-lg" : sub.code === "B" ? "text-base" : "text-sm"
            : "text-xs";
          const toppingSize = isHall
            ? sub.code === "A" ? "text-5xl" : sub.code === "B" ? "text-4xl" : "text-3xl"
            : "text-2xl";
          const tagText = isHall
            ? sub.code === "A" ? "text-xs" : "text-[10px]"
            : "text-[10px]";
          const slot = slotsByRoom.get(sub.label);
          const displayTitle = slot?.title || sub.sessionTitle || "";
          return (
          <div
            key={sub.label}
            title={displayTitle}
            className="rounded-lg border-2 border-foreground/15 bg-gradient-to-br from-white to-white/60 px-2 py-1.5 flex flex-col justify-center min-h-[120px] shadow-sm overflow-hidden"
            style={{ gridArea: sub.code.toLowerCase() }}
          >
            <div className={`flex items-center justify-between gap-1 ${isHall ? 'mb-2' : 'mb-1'}`}>
              <span className="text-lg font-extrabold leading-none">
                {sub.code}
              </span>
              <SlotQRControls
                day={day}
                period={period}
                room={sub.label}
                slot={slot}
                labelForModal={displayTitle || sub.label}
                compact
              />
            </div>
            <div className={`${isHall ? 'mb-2' : 'mb-1'} flex flex-col gap-1`}>
              <SlotTitleInput
                day={day}
                period={period}
                room={sub.label}
                initial={slot?.title ?? ""}
                placeholder={sub.sessionTitle ?? "행사명"}
              />
              <SlotPresenterPasswordInput
                day={day}
                period={period}
                room={sub.label}
                hasPassword={!!slot?.hasPresenterPassword}
                compact
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 items-center justify-items-center min-w-0">
              {/* 좌측: 수령률 원그래프 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="relative shrink-0 rounded-full grid place-items-center"
                  style={{
                    width: chartSize,
                    height: chartSize,
                    background: `conic-gradient(#ec4899 ${pct * 3.6}deg, #d1d5db 0)`,
                  }}
                  aria-label={`수령률 ${pct}%`}
                >
                  <div className={`absolute ${chartInset} rounded-full bg-white grid place-items-center`}>
                    <span className={`font-extrabold tabular-nums text-foreground ${chartText}`}>{pct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  <span className={`inline-flex items-center gap-0.5 rounded-full bg-grad-blueberry/15 border border-grad-blueberry/30 px-1.5 py-0.5 font-extrabold text-grad-blueberry ${tagText}`}>
                    주문 <span className="tabular-nums">{sub.orders}</span>
                  </span>
                  <span className={`inline-flex items-center gap-0.5 rounded-full bg-grad-strawberry/15 border border-grad-strawberry/30 px-1.5 py-0.5 font-extrabold text-grad-strawberry ${tagText}`}>
                    수령 <span className="tabular-nums">{sub.pickups}</span>
                  </span>
                </div>
              </div>
              {/* 우측: 토핑(질문) 수 카드 */}
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-grad-mango/30 bg-gradient-to-br from-grad-mango/15 to-grad-mango/5 px-3 sm:px-4 py-2 h-full gap-2 min-w-0">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold text-muted-foreground leading-none mb-1">
                    토핑 (질문)
                  </span>
                  <span className={`font-extrabold tabular-nums text-grad-mango leading-none ${toppingSize}`}>
                    {sub.toppings}
                  </span>
                </div>
                <button className="rounded-lg bg-grad-mango px-3 py-1 text-[10px] font-extrabold text-white shadow-cream hover:opacity-90 transition-opacity whitespace-nowrap">
                  토핑확인
                </button>
              </div>
            </div>
          </div>
          );
        })}

      </div>
        </>
      )}
    </div>
  );
}


function TotalCard({
  label,
  sublabel,
  value,
  grad,
}: {
  label: string;
  sublabel?: string;
  value: number;
  grad: string;
}) {
  return (
    <div className="relative overflow-hidden bg-card rounded-2xl p-5 sm:p-6 shadow-cream border border-white/60">
      <div className={`absolute inset-0 ${grad} opacity-15`} />
      <ToppingScatter density="low" seed={`tot-${label}`} />
      <div className="relative flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          {sublabel && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {sublabel}
            </p>
          )}
          <p className="text-4xl sm:text-5xl font-extrabold mt-2 leading-none">
            {value}
          </p>
        </div>
        <span
          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-cream ${grad}`}
        >
          LIVE
        </span>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  grad,
}: {
  label: string;
  value: number;
  grad: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/70 bg-white/70 px-2.5 py-1.5">
      <div className={`absolute inset-0 ${grad} opacity-15`} />
      <div className="relative">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-extrabold leading-tight">{value}</p>
      </div>
    </div>
  );
}

function MobileVenueCard({
  venue,
  day,
  period,
  slotsByRoom,
}: {
  venue: VenueStat;
  day: number;
  period: Period;
  slotsByRoom: Map<string, SlotDTO>;
}) {
  return (
    <div className="relative overflow-hidden bg-card rounded-2xl p-3 shadow-cream border border-white/70">
      <ToppingScatter density="low" seed={`mv-${venue.id}`} />
      <div className="relative flex items-baseline justify-between mb-2">
        <h3 className="font-extrabold text-base leading-none">{venue.name}</h3>
        {!venue.noMetrics && (
          <span className="text-[10px] font-bold text-muted-foreground">
            주문 <span className="text-grad-blueberry">{venue.totalOrders}</span>
            {" · "}
            수령 <span className="text-grad-strawberry">{venue.totalPickups}</span>
          </span>
        )}
      </div>

      {venue.noMetrics ? (
        <div className="text-center text-[11px] text-muted-foreground py-3">
          주문/수령 집계 없음
        </div>
      ) : (
        <div className="relative flex flex-col gap-2">
          {venue.subs.map((sub) => {
            const pct = sub.orders > 0
              ? Math.min(100, Math.round((sub.pickups / sub.orders) * 100))
              : 0;
            const slot = slotsByRoom.get(sub.label);
            const displayTitle = slot?.title || sub.sessionTitle || "";
            return (
              <div
                key={sub.label}
                className="rounded-xl border border-foreground/10 bg-gradient-to-br from-white to-white/70 p-2.5 flex items-center gap-3"
              >
                {/* 코드 + 도넛 */}
                <div className="flex flex-col items-center shrink-0 w-14">
                  <span className="text-sm font-extrabold leading-none mb-1">
                    {sub.code}
                  </span>
                  <div
                    className="relative rounded-full grid place-items-center"
                    style={{
                      width: 52,
                      height: 52,
                      background: `conic-gradient(#ec4899 ${pct * 3.6}deg, #d1d5db 0)`,
                    }}
                    aria-label={`수령률 ${pct}%`}
                  >
                    <div className="absolute inset-1 rounded-full bg-white grid place-items-center">
                      <span className="text-[11px] font-extrabold tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 가운데: 행사명 입력 + 주문/수령 + QR 발급 */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <SlotTitleInput
                    day={day}
                    period={period}
                    room={sub.label}
                    initial={slot?.title ?? ""}
                    placeholder={sub.sessionTitle ?? "행사명"}
                  />
                  <SlotPresenterPasswordInput
                    day={day}
                    period={period}
                    room={sub.label}
                    hasPassword={!!slot?.hasPresenterPassword}
                    compact
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-grad-blueberry/15 border border-grad-blueberry/30 px-1.5 py-0.5 text-[10px] font-extrabold text-grad-blueberry">
                      주문 <span className="tabular-nums">{sub.orders}</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-grad-strawberry/15 border border-grad-strawberry/30 px-1.5 py-0.5 text-[10px] font-extrabold text-grad-strawberry">
                      수령 <span className="tabular-nums">{sub.pickups}</span>
                    </span>
                    <SlotQRControls
                      day={day}
                      period={period}
                      room={sub.label}
                      slot={slot}
                      labelForModal={displayTitle || sub.label}
                      compact
                    />
                  </div>
                </div>


                {/* 우측: 토핑 카운트 + 버튼 */}
                <div className="flex flex-col items-center justify-center rounded-lg border border-grad-mango/30 bg-grad-mango/10 px-2 py-1.5 shrink-0 gap-1 min-w-[64px]">
                  <span className="text-[9px] font-bold text-muted-foreground leading-none">
                    토핑
                  </span>
                  <span className="text-xl font-extrabold tabular-nums text-grad-mango leading-none">
                    {sub.toppings}
                  </span>
                  <button className="rounded-md bg-grad-mango px-2 py-0.5 text-[9px] font-extrabold text-white whitespace-nowrap">
                    확인
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
