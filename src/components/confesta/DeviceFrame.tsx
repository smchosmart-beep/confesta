import type { ReactNode } from "react";
import { Smartphone, Monitor } from "lucide-react";

interface Props {
  device: "mobile" | "desktop";
  children: ReactNode;
}

/**
 * Per-role device hint wrapper.
 *
 * - device="mobile": on >=md viewports renders children inside a fixed-width
 *   phone-like frame so the role view stays mobile-shaped even on desktop.
 *   On small viewports it just passes through.
 * - device="desktop": on <lg viewports shows an info banner that the view is
 *   optimized for desktop. On large viewports it passes through.
 */
export function DeviceFrame({ device, children }: Props) {
  if (device === "mobile") {
    return (
      <>
        {/* Pass-through on small screens */}
        <div className="md:hidden">{children}</div>

        {/* Phone-shaped frame on >= md */}
        <div className="hidden md:flex md:justify-center md:px-6 md:py-8">
          <div className="relative w-full max-w-[420px] rounded-[2.5rem] border border-white/70 bg-card/70 backdrop-blur shadow-pink overflow-hidden">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 h-5 w-28 rounded-full bg-foreground/80" />
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-2 pb-1 text-[10px] font-bold text-foreground/70">
              <span className="inline-flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> 모바일 최적화
              </span>
              <span className="font-mono">9:41</span>
            </div>
            <div className="pt-7">{children}</div>
          </div>
        </div>
      </>
    );
  }

  // desktop
  return (
    <>
      <div className="lg:hidden px-4 sm:px-6 pt-3">
        <div className="relative overflow-hidden flex items-start gap-3 rounded-2xl border border-white/60 bg-grad-mango/20 p-3 text-sm shadow-cream">
          <div className="absolute inset-0 bg-grad-mango opacity-15" />
          <Monitor className="relative w-5 h-5 shrink-0 text-foreground/70 mt-0.5" />
          <p className="relative leading-snug">
            이 화면은 <strong>데스크톱(PC)</strong>에 최적화되어 있어요. 큰 화면에서
            열면 더 편하게 사용할 수 있습니다.
          </p>
        </div>
      </div>
      {children}
    </>
  );
}
