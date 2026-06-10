import { createFileRoute } from "@tanstack/react-router";
import type React from "react";
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
        const liveToppings = session
          ? toppings.filter((t) => t.sessionId === session.id).length
          : 0;

        const ord = baseOrders + liveOrders;
        const pick = Math.min(basePickups + livePickups, ord);
        const baseToppings = session ? 3 + (seed % 9) : seed % 5;

        return {
          code: code || "—",
          label: roomLabel,
          orders: ord,
          pickups: pick,
          capacity,
          sessionTitle: session?.title,
          toppings: baseToppings + liveToppings,
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
  }, [orders, scoops, toppings]);



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

        <div className="grid gap-3 sm:gap-4 p-1 sm:p-1.5 rounded-3xl border border-white/60 bg-grad-aurora-soft/30 shadow-cream grid-cols-[0.9fr_2.2fr_0.9fr] items-start">
          {/* 좌측 컬럼: 402 (위) / 401 (아래) + 400 VIP */}
          <div className="flex flex-col gap-24 self-stretch">
            {stats.filter((v) => v.id === "402").map((v) => <VenueCard key={v.id} venue={v} />)}
            {stats.filter((v) => v.id === "401").map((v) => <VenueCard key={v.id} venue={v} />)}
            {stats.filter((v) => v.id === "400").map((v) => <VenueCard key={v.id} venue={v} />)}
          </div>
          {/* 중앙 컬럼: LEWEST Hall (402-A 아래 라인부터 시작하도록 상단 여백) */}
          <div className="flex flex-col self-stretch pt-[404px]">
            {stats.filter((v) => v.id === "hall").map((v) => <VenueCard key={v.id} venue={v} />)}
          </div>
          {/* 우측 컬럼: 403 (위) / 404 (아래) */}
          <div className="flex flex-col gap-24 self-stretch">
            {stats.filter((v) => v.id === "403").map((v) => <VenueCard key={v.id} venue={v} />)}
            {stats.filter((v) => v.id === "404").map((v) => <VenueCard key={v.id} venue={v} />)}
          </div>
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
  // 401~404: 모든 서브공간 타일을 동일한 고정 높이로 (A,B,C,D 카드 크기 균일)
  const tileRow = "168px";
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

function VenueCard({ venue }: { venue: VenueStat }) {
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
          return (
          <div
            key={sub.label}
            title={sub.sessionTitle}
            className="rounded-lg border-2 border-foreground/15 bg-gradient-to-br from-white to-white/60 px-2 py-1.5 flex flex-col min-h-[120px] shadow-sm"
            style={{ gridArea: sub.code.toLowerCase() }}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold leading-none">
                {sub.code}
              </span>
            </div>
            <p className="text-xs text-foreground/80 leading-snug line-clamp-2 mb-1 flex-1">
              {sub.sessionTitle ?? "—"}
            </p>
            <div className="mt-auto grid grid-cols-2 gap-1.5 items-center">
              {/* 좌측: 수령률 원그래프 */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="relative shrink-0 rounded-full grid place-items-center"
                  style={{
                    width: 64,
                    height: 64,
                    background: `conic-gradient(#ec4899 ${pct * 3.6}deg, #d1d5db 0)`,
                  }}
                  aria-label={`수령률 ${pct}%`}
                >
                  <div className="absolute inset-1.5 rounded-full bg-white grid place-items-center">
                    <span className="text-xs font-extrabold tabular-nums text-foreground">{pct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-grad-blueberry/15 border border-grad-blueberry/30 px-1.5 py-0.5 text-[10px] font-extrabold text-grad-blueberry">
                    주문 <span className="tabular-nums">{sub.orders}</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-grad-strawberry/15 border border-grad-strawberry/30 px-1.5 py-0.5 text-[10px] font-extrabold text-grad-strawberry">
                    수령 <span className="tabular-nums">{sub.pickups}</span>
                  </span>
                </div>
              </div>
              {/* 우측: 토핑(질문) 수 카드 */}
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-grad-mango/30 bg-gradient-to-br from-grad-mango/15 to-grad-mango/5 px-1.5 py-2 h-full">
                <span className="text-[9px] font-bold text-muted-foreground leading-none mb-1">
                  토핑 (질문)
                </span>
                <span className="text-2xl font-extrabold tabular-nums text-grad-mango leading-none">
                  {sub.toppings}
                </span>
                <span className="text-[9px] font-bold text-muted-foreground leading-none mt-1">
                  개
                </span>
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

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
