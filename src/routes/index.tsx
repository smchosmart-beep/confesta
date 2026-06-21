import { createFileRoute } from "@tanstack/react-router";
import { IceCream, Mic, ScanLine, LayoutGrid, Sparkles } from "lucide-react";
import { ToppingScatter } from "@/components/confesta/ToppingDecor";
import { TruckCard } from "@/components/confesta/TruckCard";

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
    flavor: "strawberry" as const,
    device: "mobile" as const,
  },
  {
    to: "/presenter" as const,
    label: "Presenter",
    ko: "발표자",
    desc: "동적 QR 브로드캐스트 · 실시간 질문 피드",
    icon: Mic,
    flavor: "blueberry" as const,
    device: "desktop" as const,
  },
  {
    to: "/staff" as const,
    label: "Staff",
    ko: "운영 스태프",
    desc: "모바일 영수증 스캐너 · 굿즈 수령 검증",
    icon: ScanLine,
    flavor: "mint" as const,
    device: "mobile" as const,
  },
  {
    to: "/admin" as const,
    label: "Admin",
    ko: "관리자",
    desc: "벤토 그리드 운영 현황 · 실시간 깔때기 지표",
    icon: LayoutGrid,
    flavor: "mango" as const,
    device: "desktop" as const,
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
        <h1 className="relative mt-5 flex flex-col items-center gap-2 font-extrabold tracking-tight">
          <span className="text-base sm:text-lg font-bold text-muted-foreground">
            AI 디지털 컨퍼런스&페스티벌
          </span>
          <span className="text-5xl sm:text-6xl text-grad-sunset bg-grad-sunset-anim bg-clip-text">
            2026 Confesta
          </span>
        </h1>
        <p className="relative mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          수강신청부터 출석 인증, 토핑 질문, 굿즈 수령까지 —<br />
          아이스크림 한 콘으로 즐기는 컨퍼런스 데모입니다.
        </p>
      </section>

      <section className="px-4 sm:px-6 pb-20 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {ROLES.map((r) => (
            <TruckCard
              key={r.to}
              to={r.to}
              flavor={r.flavor}
              label={r.label}
              ko={r.ko}
              desc={r.desc}
              icon={r.icon}
              device={r.device}
            />
          ))}
        </div>

      </section>
    </main>
  );
}
