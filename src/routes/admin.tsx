import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { DeviceFrame } from "@/components/confesta/DeviceFrame";
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
          "룸별 운영 현황과 등록→출석→굿즈수령 깔때기 지표를 한눈에 확인하는 벤토 그리드 대시보드.",
      },
      { property: "og:title", content: "관리자 대시보드 — Confesta" },
      {
        property: "og:description",
        content: "벤토 그리드 운영 현황 · 실시간 깔때기 지표.",
      },
    ],
  }),
  component: AdminView,
});

function AdminView() {
  const enrolled = useConfestaStore((s) => s.enrolledSessionIds);
  const scoops = useConfestaStore((s) => s.scoops);
  const log = useConfestaStore((s) => s.redemptionLog);

  const stats = useMemo(() => {
    return ROOMS.map((room) => {
      const sessions = SESSIONS.filter((s) => s.room === room);
      const sessionStats = sessions.map((s) => {
        // mock base + live signal
        const seed = parseInt(s.id.replace(/\D/g, "")) || 1;
        const baseEnrolled = ((seed * 11) % (s.capacity - 5)) + 5;
        const userEnrolled = enrolled.includes(s.id) ? 1 : 0;
        const registered = baseEnrolled + userEnrolled;
        const baseAttended = Math.floor(baseEnrolled * 0.7);
        const userAttended = scoops.some((sc) => sc.sessionId === s.id) ? 1 : 0;
        const attended = baseAttended + userAttended;
        const baseClaimed = Math.floor(baseAttended * 0.55);
        const userClaimed = log.filter((l) => l.status === "success").length > 0 && scoops.some((sc) => sc.sessionId === s.id) ? 1 : 0;
        const claimed = baseClaimed + userClaimed;
        return { session: s, registered, attended, claimed };
      });
      return { room, sessionStats };
    });
  }, [enrolled, scoops, log]);

  const totals = useMemo(() => {
    const flat = stats.flatMap((r) => r.sessionStats);
    return flat.reduce(
      (acc, s) => ({
        registered: acc.registered + s.registered,
        attended: acc.attended + s.attended,
        claimed: acc.claimed + s.claimed,
      }),
      { registered: 0, attended: 0, claimed: 0 },
    );
  }, [stats]);

  return (
    <main className="min-h-screen pb-16">
      <RoleHeader
        role="관리자 (Admin)"
        description="벤토 그리드 운영 현황 · 실시간 깔때기"
        color="mango"
      />

      <DeviceFrame device="desktop">
        <></>
      </DeviceFrame>

      <section className="px-4 sm:px-6 max-w-[1400px] mx-auto">
        {/* Totals */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <TotalCard label="등록 (신청)" value={totals.registered} grad="bg-grad-blueberry" />
          <TotalCard label="출석 (스쿱)" value={totals.attended} grad="bg-grad-strawberry" />
          <TotalCard label="굿즈 수령" value={totals.claimed} grad="bg-grad-success" />
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {stats.map((room) => (
            <div
              key={room.room}
              className="relative overflow-hidden bg-card rounded-3xl p-5 shadow-cream border border-white/60"
            >
              <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />
              <ToppingScatter density="low" seed={`adm-${room.room}`} />
              <div className="relative flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg">{room.room}</h3>
                <span className="text-xs text-muted-foreground">
                  {room.sessionStats.length} 세션
                </span>
              </div>

              <div className="relative space-y-4">
                {room.sessionStats.map((s) => {
                  const cat = getCategory(s.session.category);
                  const max = s.session.capacity;
                  const regPct = (s.registered / max) * 100;
                  const attPct = (s.attended / max) * 100;
                  const claimPct = (s.claimed / max) * 100;
                  const flavorGrad = `bg-grad-${cat.flavor === "strawberry" ? "strawberry" : cat.flavor === "mint" ? "mint" : cat.flavor === "mango" ? "mango" : cat.flavor === "blueberry" ? "blueberry" : "chocolate"}`;
                  return (
                    <div key={s.session.id}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">
                            {s.session.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                          className="absolute inset-y-0 left-0 bg-grad-blueberry opacity-50 rounded-full"
                          style={{ width: `${regPct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-grad-strawberry opacity-80 rounded-full"
                          style={{ width: `${attPct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-grad-success rounded-full"
                          style={{ width: `${claimPct}%` }}
                        />
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-1 text-[11px] font-semibold">
                        <span className="text-grad-aurora font-bold">신청 {s.registered}</span>
                        <span className="text-grad-strawberry font-bold">출석 {s.attended}</span>
                        <span className="text-grad-aurora font-bold">수령 {s.claimed}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-xs text-muted-foreground bg-muted/50 rounded-2xl p-4">
          ※ 데모 데이터입니다. 현재 브라우저의 청중·스태프 활동이 실시간으로
          반영됩니다 (등록/출석/수령에 +1).
        </div>
      </section>
    </main>
  );
}

function TotalCard({
  label,
  value,
  grad,
}: {
  label: string;
  value: number;
  grad: string;
}) {
  return (
    <div className="relative overflow-hidden bg-card rounded-2xl p-4 sm:p-5 shadow-cream border border-white/60">
      <div className={`absolute inset-0 ${grad} opacity-15`} />
      <ToppingScatter density="low" seed={`tot-${label}`} />
      <div className="relative">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-3xl sm:text-4xl font-extrabold mt-1">{value}</p>
        <span
          className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-cream ${grad}`}
        >
          LIVE
        </span>
      </div>
    </div>
  );
}
