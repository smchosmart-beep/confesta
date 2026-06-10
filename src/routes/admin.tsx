import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { SESSIONS, ROOMS, getCategory } from "@/lib/confesta/mockData";
import { useConfestaStore } from "@/lib/confesta/store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "관리자 대시보드 — Confesta" },
      {
        name: "description",
        content:
          "행사 장소별 주문(등록) QR과 수령(출석) QR 스캔 수를 실시간으로 확인하는 운영 대시보드.",
      },
      { property: "og:title", content: "관리자 대시보드 — Confesta" },
      {
        property: "og:description",
        content: "장소별 주문 QR · 수령 QR 스캔 집계.",
      },
    ],
  }),
  component: AdminView,
});

function AdminView() {
  const orders = useConfestaStore((s) => s.orders);
  const scoops = useConfestaStore((s) => s.scoops);

  // 세션 단위 집계: 주문(등록) QR 스캔 수, 수령(출석) QR 스캔 수
  const stats = useMemo(() => {
    return ROOMS.map((room) => {
      const sessions = SESSIONS.filter((s) => s.room === room);
      const sessionStats = sessions.map((s) => {
        // demo baseline so empty rooms still read meaningfully
        const seed = parseInt(s.id.replace(/\D/g, "")) || 1;
        const baseOrders = ((seed * 11) % (s.capacity - 5)) + 5;
        const basePickups = Math.floor(baseOrders * 0.72);

        const liveOrders = orders.filter((o) => o.sessionId === s.id).length;
        const livePickups = scoops.filter((sc) => sc.sessionId === s.id).length;

        const orderCount = baseOrders + liveOrders;
        const pickupCount = Math.min(basePickups + livePickups, orderCount);
        return { session: s, orderCount, pickupCount };
      });
      const roomOrders = sessionStats.reduce((a, b) => a + b.orderCount, 0);
      const roomPickups = sessionStats.reduce((a, b) => a + b.pickupCount, 0);
      return { room, sessionStats, roomOrders, roomPickups };
    });
  }, [orders, scoops]);

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, r) => ({
          orders: acc.orders + r.roomOrders,
          pickups: acc.pickups + r.roomPickups,
        }),
        { orders: 0, pickups: 0 },
      ),
    [stats],
  );

  return (
    <main className="min-h-screen pb-16">
      <RoleHeader
        role="관리자 (Admin)"
        description="행사 장소별 주문(등록) QR · 수령(출석) QR 실시간 집계"
        color="mango"
      />

      <section className="px-4 sm:px-6 max-w-[1400px] mx-auto">
        {/* 전체 합계 — 핵심 두 지표 */}
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

        {/* 장소별 카드 */}
        <h2 className="text-sm font-extrabold text-muted-foreground uppercase tracking-wider mb-3">
          행사 장소별 현황
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {stats.map((room) => {
            const rate =
              room.roomOrders > 0
                ? Math.round((room.roomPickups / room.roomOrders) * 100)
                : 0;
            return (
              <div
                key={room.room}
                className="relative overflow-hidden bg-card rounded-3xl p-5 shadow-cream border border-white/60"
              >
                <div className="absolute inset-0 bg-grad-aurora-soft opacity-30" />
                <ToppingScatter density="low" seed={`adm-${room.room}`} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-lg">{room.room}</h3>
                    <span className="text-xs text-muted-foreground">
                      {room.sessionStats.length} 세션
                    </span>
                  </div>

                  {/* 장소 합계: 두 카운트 + 수령률 */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <RoomMetric
                      label="주문 QR"
                      value={room.roomOrders}
                      grad="bg-grad-blueberry"
                    />
                    <RoomMetric
                      label="수령 QR"
                      value={room.roomPickups}
                      grad="bg-grad-strawberry"
                    />
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
                      <span>수령률 (수령/주문)</span>
                      <span className="text-foreground">{rate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-grad-success rounded-full transition-all"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>

                  {/* 세션별 분해 */}
                  <div className="space-y-3">
                    {room.sessionStats.map((s) => {
                      const cat = getCategory(s.session.category);
                      const orderPct =
                        (s.orderCount / s.session.capacity) * 100;
                      const pickupPct =
                        (s.pickupCount / s.session.capacity) * 100;
                      const flavorGrad = `bg-grad-${
                        cat.flavor === "strawberry"
                          ? "strawberry"
                          : cat.flavor === "mint"
                            ? "mint"
                            : cat.flavor === "mango"
                              ? "mango"
                              : cat.flavor === "blueberry"
                                ? "blueberry"
                                : "chocolate"
                      }`;
                      return (
                        <div key={s.session.id}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate">
                                {s.session.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                Day {s.session.day} · {s.session.timeSlot} ·{" "}
                                {s.session.presenter}
                              </p>
                            </div>
                            <span
                              className={`${flavorGrad} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-cream`}
                            >
                              {cat.label}
                            </span>
                          </div>

                          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-grad-blueberry opacity-60 rounded-full"
                              style={{ width: `${orderPct}%` }}
                            />
                            <div
                              className="absolute inset-y-0 left-0 bg-grad-strawberry rounded-full"
                              style={{ width: `${pickupPct}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-grad-aurora font-bold">
                              주문 {s.orderCount}
                            </span>
                            <span className="text-grad-strawberry font-bold">
                              수령 {s.pickupCount}
                            </span>
                            <span className="text-muted-foreground">
                              정원 {s.session.capacity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-xs text-muted-foreground bg-muted/50 rounded-2xl p-4">
          ※ 데모 데이터에 현재 브라우저의 스캔 활동이 실시간으로 합산됩니다.
          파란색 = 주문(등록) QR, 분홍색 = 수령(출석) QR.
        </div>
      </section>
    </main>
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

function RoomMetric({
  label,
  value,
  grad,
}: {
  label: string;
  value: number;
  grad: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/70 p-3">
      <div className={`absolute inset-0 ${grad} opacity-15`} />
      <div className="relative">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-extrabold leading-tight">{value}</p>
      </div>
    </div>
  );
}
