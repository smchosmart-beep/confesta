import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RoleHeader } from "@/components/confesta/RoleHeader";
import { CameraScanner } from "@/components/confesta/CameraScanner";
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

      <section className="px-4 sm:px-6 max-w-md mx-auto">
        <CameraScanner
          onScan={(text) => setResult(redeem(text))}
          hintLine="청중의 영수증 QR을 비추세요"
        />
      </section>

      {/* Recent log */}
      <section className="px-4 sm:px-6 max-w-md mx-auto mt-8">
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
                className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-2.5 text-sm"
              >
                <span className="font-mono text-xs truncate max-w-[55%]">
                  {l.token.slice(0, 24)}…
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.redeemedAt).toLocaleTimeString("ko-KR")}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      l.status === "success"
                        ? "bg-success/15 text-success"
                        : l.status === "duplicate"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-muted text-muted-foreground"
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

      {/* Result overlay */}
      {result && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-6"
          onClick={() => setResult(null)}
        >
          <div
            className={`relative max-w-sm w-full bg-card rounded-3xl p-8 text-center shadow-2xl ${
              result.status !== "success" ? "" : ""
            }`}
            style={{
              animation:
                result.status !== "success"
                  ? "var(--animate-shake)"
                  : undefined,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setResult(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            {result.status === "success" ? (
              <>
                <div className="w-20 h-20 rounded-full bg-success/15 text-success mx-auto flex items-center justify-center mb-4">
                  <Check className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-extrabold">유효한 영수증입니다</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  3-스쿱 확인 완료. 키캡을 전달하세요.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-destructive/15 text-destructive mx-auto flex items-center justify-center mb-4">
                  <AlertOctagon className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-extrabold text-destructive">
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
              className="bounce-press mt-6 w-full bg-primary text-primary-foreground rounded-full py-3 font-bold"
            >
              확인 · 다음 스캔
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
