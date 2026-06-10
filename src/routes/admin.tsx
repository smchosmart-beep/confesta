import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { SESSIONS, VENUES } from "@/lib/confesta/mockData";
import { useConfestaStore } from "@/lib/confesta/store";

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
  component: AdminView,
});

interface SubStat {
  code: string; // "A"/"B"/...
  label: string; // e.g. "401-A"
  orders: number;
  pickups: number;
  capacity: number;
  sessionTitle?: string;
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
        const session = SESSIONS.find((s) => s.room === roomLabel);

        // demo baseline + live signals
        const seed =
          [...roomLabel].reduce((a, c) => a + c.charCodeAt(0), 0) % 47;
        const capacity = session?.capacity ?? 30;
        const baseOrders = session ? 8 + (seed % (capacity - 8)) : seed % 12;
        const basePickups = Math.floor(baseOrders * 0.7);

        const liveOrders = session
          ? orders.filter((o) => o.sessionId === session.id).length
          : 0;
        const livePickups = session
          ? scoops.filter((sc) => sc.sessionId === session.id).length
          : 0;

        const ord = baseOrders + liveOrders;
        const pick = Math.min(basePickups + livePickups, ord);

        return {
          code: code || "—",
          label: roomLabel,
          orders: ord,
          pickups: pick,
          capacity,
          sessionTitle: session?.title,
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
  }, [orders, scoops]);



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

        <div
          className="grid gap-3 sm:gap-4 p-3 sm:p-4 rounded-3xl border border-white/60 bg-grad-aurora-soft/30 shadow-cream"
          style={{
            gridTemplateColumns: "1.1fr 1.6fr 1.1fr",
            gridTemplateAreas: `
              "v402  hall  v403"
              "v401  hall  v404"
              "v400  .     ."
            `,
          }}
        >

          {stats.map((v) => (
            <VenueCard key={v.id} venue={v} />
          ))}
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

function VenueCard({ venue }: { venue: VenueStat }) {
  const rate =
    venue.totalOrders > 0
      ? Math.round((venue.totalPickups / venue.totalOrders) * 100)
      : 0;
  return (
    <div
      className="relative overflow-hidden bg-card rounded-2xl p-4 shadow-cream border border-white/70 flex flex-col"
      style={{ gridArea: venue.area }}
    >
      <ToppingScatter density="low" seed={`v-${venue.id}`} />
      <div className="relative flex items-baseline justify-between mb-2">
        <h3 className="font-extrabold text-base sm:text-lg leading-none">
          {venue.name}
        </h3>
        <span className="text-[10px] font-bold text-muted-foreground">
          {venue.subs.length} 공간
        </span>
      </div>

      {/* 합계 두 카운트 + 수령률 */}
      <div className="relative grid grid-cols-2 gap-2 mb-2">
        <MiniMetric label="주문" value={venue.totalOrders} grad="bg-grad-blueberry" />
        <MiniMetric label="수령" value={venue.totalPickups} grad="bg-grad-strawberry" />
      </div>
      <div className="relative mb-3">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
          <span>수령률</span>
          <span className="text-foreground">{rate}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-grad-success rounded-full transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      {/* 서브 공간 분해 */}
      <div className="relative space-y-1.5 mt-auto">
        {venue.subs.map((sub) => {
          const cap = sub.capacity || 30;
          const orderPct = Math.min(100, (sub.orders / cap) * 100);
          const pickupPct = Math.min(100, (sub.pickups / cap) * 100);
          const session = sub.sessionTitle;
          return (
            <div
              key={sub.label}
              className="rounded-xl border border-white/70 bg-white/60 px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-extrabold">
                  {sub.label}
                </span>
                <span className="text-[10px] font-bold text-grad-aurora">
                  주문 {sub.orders} · 수령 {sub.pickups}
                </span>
              </div>
              {session && (
                <p className="text-[10px] text-muted-foreground truncate mb-1">
                  {session}
                </p>
              )}
              <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-grad-blueberry opacity-60 rounded-full"
                  style={{ width: `${orderPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-grad-strawberry rounded-full"
                  style={{ width: `${pickupPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
