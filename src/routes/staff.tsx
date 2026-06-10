import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { DeviceFrame } from "@/components/confesta/DeviceFrame";
import { CameraScanner } from "@/components/confesta/CameraScanner";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { useConfestaStore } from "@/lib/confesta/store";
import type { RedemptionLog } from "@/lib/confesta/types";
import { Check, AlertOctagon, X } from "lucide-react";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "스태프 뷰 — Confesta" },
      {
        name: "description",
        content: "디지털 보상 영수증을 스캔해 굿즈 수령을 검증하세요.",
      },
      { property: "og:title", content: "스태프 뷰 — Confesta" },
      {
        property: "og:description",
        content: "영수증 스캔 · 굿즈 수령 검증.",
      },
    ],
  }),
  component: StaffView,
});

function StaffView() {
  const redeem = useConfestaStore((s) => s.redeemReceipt);
  const log = useConfestaStore((s) => s.redemptionLog);
  const [result, setResult] = useState<RedemptionLog | null>(null);

  return (
    <main className="min-h-screen pb-16">
      <RoleHeader
        role="운영 스태프 (Staff)"
        description="영수증 스캔 → 굿즈 수령 검증"
        color="mint"
      />

      <DeviceFrame device="mobile">
        <section className="px-4 max-w-md mx-auto">
          <CameraScanner
            onScan={(text) => setResult(redeem(text))}
            hintLine="청중의 영수증 QR을 비추세요"
          />
        </section>

        {/* Recent log */}
        <section className="px-4 max-w-md mx-auto mt-8">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">
            최근 검증 로그
          </h3>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {log.slice(0, 6).map((l, i) => (
                <li
                  key={i}
                  className="relative overflow-hidden flex items-center justify-between bg-card border border-white/60 rounded-2xl px-4 py-2.5 text-sm shadow-cream"
                >
                  <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />
                  <span className="relative font-mono text-xs truncate max-w-[55%]">
                    {l.token.slice(0, 24)}…
                  </span>
                  <span className="relative flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.redeemedAt).toLocaleTimeString("ko-KR")}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full text-white shadow-cream ${
                        l.status === "success"
                          ? "bg-grad-success"
                          : l.status === "duplicate"
                            ? "bg-grad-danger"
                            : "bg-grad-muted text-foreground"
                      }`}
                    >
                      {l.status === "success"
                        ? "성공"
                        : l.status === "duplicate"
                          ? "중복"
                          : "무효"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </DeviceFrame>


      {/* Result overlay */}
      {result && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-6"
          onClick={() => setResult(null)}
        >
          <div
            className="relative overflow-hidden max-w-sm w-full bg-card rounded-3xl p-8 text-center shadow-pink border border-white/60"
            style={{
              animation:
                result.status !== "success"
                  ? "var(--animate-shake)"
                  : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`absolute inset-0 opacity-60 ${
                result.status === "success"
                  ? "bg-grad-aurora-soft"
                  : "bg-grad-sunset-soft"
              }`}
            />
            <ToppingScatter density="med" seed={`staff-${result.status}`} />
            <button
              onClick={() => setResult(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative">
              {result.status === "success" ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-grad-success text-white mx-auto flex items-center justify-center mb-4 shadow-cream">
                    <Check className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-grad-sunset">
                    유효한 영수증입니다
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    3-스쿱 확인 완료. 키캡을 전달하세요.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-grad-danger text-white mx-auto flex items-center justify-center mb-4 shadow-pink">
                    <AlertOctagon className="w-12 h-12" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-grad-strawberry">
                    {result.status === "duplicate"
                      ? "이미 수령됨"
                      : "무효 토큰"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {result.status === "duplicate"
                      ? `이전 수령 시각: ${new Date(result.redeemedAt).toLocaleString("ko-KR")}`
                      : "이 영수증은 인식할 수 없습니다."}
                  </p>
                </>
              )}

              <button
                onClick={() => setResult(null)}
                className="bounce-press mt-6 w-full bg-grad-strawberry text-white rounded-full py-3 font-bold shadow-pink"
              >
                확인 · 다음 스캔
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
