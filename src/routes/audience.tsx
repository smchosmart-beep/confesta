import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { DeviceFrame } from "@/components/confesta/DeviceFrame";
import { PillTabs } from "@/components/confesta/PillTabs";
import { SessionCard } from "@/components/confesta/SessionCard";
import { IceCreamCone } from "@/components/confesta/IceCreamCone";
import { CameraScanner } from "@/components/confesta/CameraScanner";
import { ToppingInput } from "@/components/confesta/ToppingInput";
import { ReceiptCard } from "@/components/confesta/ReceiptCard";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { SESSIONS } from "@/lib/confesta/mockData";
import { useConfestaStore, MAX_SCOOPS_CONST } from "@/lib/confesta/store";
import { Camera, Receipt, Sparkles, CalendarDays, IceCreamCone as IceCreamConeIcon } from "lucide-react";

export const Route = createFileRoute("/audience")({
  head: () => ({
    meta: [
      { title: "청중 뷰 — Confesta" },
      {
        name: "description",
        content:
          "수강신청, 출석 스쿱 적립, 라이브 토핑 질문, 디지털 보상 영수증을 한 곳에서.",
      },
      { property: "og:title", content: "청중 뷰 — Confesta" },
      {
        property: "og:description",
        content: "수강신청 · 스쿱 · 토핑 · 영수증을 한 곳에서.",
      },
    ],
  }),
  component: AudienceView,
});

type Section = "explore" | "live" | "topping" | "receipt";
type Day = "1" | "2";

function AudienceView() {
  const [section, setSection] = useState<Section>("explore");
  const [day, setDay] = useState<Day>("1");
  const [scanOpen, setScanOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const scoops = useConfestaStore((s) => s.scoops);
  const addScoop = useConfestaStore((s) => s.addScoopFromQR);

  const sessionsForDay = useMemo(
    () => SESSIONS.filter((s) => s.day === Number(day)),
    [day],
  );
  const activeSessionId = scoops[scoops.length - 1]?.sessionId ?? SESSIONS[0].id;

  return (
    <main className="min-h-screen pb-32">
      <RoleHeader
        role="청중 (Audience)"
        description="수강신청부터 영수증까지 — 콘에 스쿱을 차곡차곡"
        color="pink"
      />

      <DeviceFrame device="mobile">
        <div className="px-4 flex justify-center">
          <div className="w-full overflow-x-auto">
            <div className="flex justify-center min-w-max">
              <PillTabs<Section>
                value={section}
                onChange={setSection}
                tabs={[
                  { value: "explore", label: "주문", icon: <CalendarDays className="w-4 h-4" /> },
                  { value: "live", label: "My 콘", icon: <IceCreamConeIcon className="w-4 h-4" /> },
                  { value: "topping", label: "토핑 추가", icon: <Sparkles className="w-4 h-4" /> },
                  { value: "receipt", label: "영수증", icon: <Receipt className="w-4 h-4" /> },
                ]}
              />
            </div>
          </div>
        </div>

        <section className="px-4 mt-6">
          {section === "explore" && (
            <div>
              <div className="mb-5 flex justify-end">
                <PillTabs<Day>
                  size="sm"
                  value={day}
                  onChange={setDay}
                  tabs={[
                    { value: "1", label: "Day 1 (Fri)" },
                    { value: "2", label: "Day 2 (Sat)" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {sessionsForDay.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            </div>
          )}

          {section === "live" && (
            <div className="grid grid-cols-1 gap-6 items-start">
            <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
              <div className="absolute inset-0 bg-grad-sunset-soft opacity-50" />
              <ToppingScatter density="med" seed="audience-cone" />
              <div className="relative">
                <h3 className="font-bold text-lg mb-2">나의 콘</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {scoops.length} / {MAX_SCOOPS_CONST} 스쿱 적립
                </p>
                <div className="flex justify-center">
                  <IceCreamCone scoops={scoops} size={220} />
                </div>
              </div>
            </div>

            <div>
              {!scanOpen ? (
                <button
                  onClick={() => {
                    setScanOpen(true);
                    setFeedback(null);
                  }}
                  className="relative overflow-hidden bounce-press w-full bg-grad-strawberry text-white rounded-3xl p-8 shadow-pink font-bold text-lg flex flex-col items-center gap-2"
                >
                  <ToppingScatter density="med" seed="audience-scan-cta" />
                  <Camera className="w-8 h-8 relative" />
                  <span className="relative">카메라로 QR 스캔하기</span>
                </button>
              ) : (
                <div>
                  <CameraScanner
                    onScan={(text) => {
                      const result = addScoop(text);
                      setFeedback({
                        ok: result.ok,
                        msg: result.ok
                          ? "스쿱이 콘에 쌓였어요! 🍦"
                          : result.reason ?? "오류",
                      });
                      if (result.ok) setScanOpen(false);
                    }}
                    onClose={() => setScanOpen(false)}
                    hintLine="발표자 화면의 QR을 비추세요 (15초마다 갱신됩니다)"
                  />
                </div>
              )}

              {feedback && (
                <div
                  className={`mt-4 p-4 rounded-2xl text-sm font-semibold text-center text-white shadow-cream ${
                    feedback.ok ? "bg-grad-success" : "bg-grad-danger"
                  }`}
                >
                  {feedback.msg}
                </div>
              )}
            </div>
          </div>
        )}

          {section === "topping" && (
            <div className="mx-auto">
              <div className="relative overflow-hidden bg-card rounded-3xl p-6 shadow-cream border border-white/60">
                <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
                <ToppingScatter density="med" seed="audience-topping" />
                <div className="relative">
                  <h3 className="font-bold text-lg mb-1">토핑 보내기</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    현재 세션:{" "}
                    <strong>
                      {SESSIONS.find((s) => s.id === activeSessionId)?.title ?? "—"}
                    </strong>
                  </p>
                  <ToppingInput sessionId={activeSessionId} />
                  <p className="text-xs text-muted-foreground mt-4">
                    전송한 토핑은 발표자 뷰의 질문 그리드에서 확인할 수 있어요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {section === "receipt" && (
            <div className="py-4">
              <ReceiptCard />
            </div>
          )}
        </section>
      </DeviceFrame>
    </main>
  );
}
