import { createFileRoute, Link } from "@tanstack/react-router";
import { IceCream, Mic, ScanLine, LayoutGrid, Sparkles } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Confesta (콘페스타) — 달콤한 컨퍼런스 플랫폼" },
      {
        name: "description",
        content:
          "수강신청부터 스쿱 적립, 디지털 영수증 보상까지 — 아이스크림 한 콘으로 즐기는 게이미피케이션 컨퍼런스 플랫폼.",
      },
      { property: "og:title", content: "Confesta (콘페스타)" },
      {
        property: "og:description",
        content: "아이스크림 한 콘으로 즐기는 게이미피케이션 컨퍼런스 플랫폼",
      },
    ],
  }),
  component: Home,
});

const ROLES = [
  {
    to: "/audience" as const,
    label: "Audience",
    ko: "청중",
    desc: "수강신청 · 스쿱 적립 · 토핑 질문 · 디지털 영수증",
    icon: IceCream,
    grad: "bg-grad-strawberry",
    softGrad: "bg-grad-sunset-soft",
    shadow: "shadow-pink",
  },
  {
    to: "/presenter" as const,
    label: "Presenter",
    ko: "발표자",
    desc: "동적 QR 브로드캐스트 · 실시간 질문 피드",
    icon: Mic,
    grad: "bg-grad-blueberry",
    softGrad: "bg-grad-aurora-soft",
    shadow: "shadow-blue",
  },
  {
    to: "/staff" as const,
    label: "Staff",
    ko: "운영 스태프",
    desc: "모바일 영수증 스캐너 · 굿즈 수령 검증",
    icon: ScanLine,
    grad: "bg-grad-mint",
    softGrad: "bg-grad-aurora-soft",
    shadow: "shadow-cream",
  },
  {
    to: "/admin" as const,
    label: "Admin",
    ko: "관리자",
    desc: "벤토 그리드 운영 현황 · 실시간 깔때기 지표",
    icon: LayoutGrid,
    grad: "bg-grad-mango",
    softGrad: "bg-grad-sunset-soft",
    shadow: "shadow-cream",
  },
];

function Home() {
  return (
    <main className="min-h-screen">
      <section className="relative px-6 pt-14 pb-10 max-w-6xl mx-auto text-center overflow-hidden">
        <ToppingScatter density="med" seed="home-hero" />
        <span className="relative inline-flex items-center gap-1.5 bg-grad-strawberry text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-pink">
          <Sparkles className="w-3.5 h-3.5" /> Sweet Conference Platform
        </span>
        <h1 className="relative mt-5 text-5xl sm:text-6xl font-extrabold tracking-tight">
          <span className="text-grad-sunset bg-grad-sunset-anim bg-clip-text">
            Confesta
          </span>{" "}
          <span className="text-grad-strawberry">콘페스타</span>
        </h1>
        <p className="relative mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          수강신청부터 출석 인증, 토핑 질문, 굿즈 수령까지 —<br />
          아이스크림 한 콘으로 즐기는 컨퍼런스 데모입니다.
        </p>
      </section>

      <section className="px-4 sm:px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ROLES.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className={`group bounce-press relative overflow-hidden rounded-3xl bg-card p-6 border border-white/60 ${r.shadow}`}
            >
              <div className={`absolute inset-0 ${r.softGrad} opacity-60`} />
              <ToppingScatter density="med" seed={`role-${r.to}`} />
              <div className="relative flex items-start gap-4">
                <span
                  className={`${r.grad} text-white w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-pink ring-2 ring-white/60`}
                >
                  <r.icon className="w-7 h-7 drop-shadow" />
                </span>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-foreground/60">
                    {r.label}
                  </div>
                  <h2 className="text-2xl font-extrabold mt-0.5">{r.ko}</h2>
                  <p className="text-sm text-foreground/70 mt-2">{r.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="relative overflow-hidden mt-10 bg-card border border-white/60 rounded-2xl p-5 text-sm text-muted-foreground shadow-cream">
          <div className="absolute inset-0 bg-grad-aurora-soft opacity-40" />
          <ToppingScatter density="low" seed="home-info" />
          <p className="relative">
            <strong className="text-foreground">데모 안내:</strong> 같은
            브라우저 안에서 4개 역할 뷰가 로컬 상태로 연동됩니다. 다른 탭에서{" "}
            <code className="px-1.5 py-0.5 bg-grad-muted rounded">/presenter</code>{" "}
            를 열어 QR을 표시한 뒤, 또 다른 탭의{" "}
            <code className="px-1.5 py-0.5 bg-grad-muted rounded">/audience</code>{" "}
            에서 카메라로 스캔해보세요. 3스쿱을 모으면 영수증이 발급되고,{" "}
            <code className="px-1.5 py-0.5 bg-grad-muted rounded">/staff</code>{" "}
            에서 그 영수증을 검증할 수 있습니다.
          </p>
        </div>
      </section>
    </main>
  );
}
