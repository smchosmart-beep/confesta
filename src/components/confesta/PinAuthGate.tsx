import { useEffect, useRef, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkPin, verifyPin } from "@/lib/confesta/auth.functions";
import type { PinRole } from "@/lib/confesta/pin.server";

interface Props {
  role: PinRole;
  title: string;
  description: string;
  accent?: "mango" | "strawberry" | "mint";
  children: React.ReactNode;
}

const ACCENT: Record<NonNullable<Props["accent"]>, { bg: string; shadow: string }> = {
  mango: { bg: "bg-grad-mango", shadow: "shadow-cream" },
  strawberry: { bg: "bg-grad-strawberry", shadow: "shadow-pink" },
  mint: { bg: "bg-grad-mint", shadow: "shadow-cream" },
};

export function PinAuthGate({ role, title, description, accent = "mango", children }: Props) {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkPin);
  const verifyFn = useServerFn(verifyPin);
  const a = ACCENT[accent];

  const { data, isLoading } = useQuery({
    queryKey: ["pin", role],
    queryFn: () => checkFn({ data: { role } }),
    staleTime: 60_000,
  });

  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!data?.ok) inputRef.current?.focus();
  }, [data?.ok]);

  const verify = useMutation({
    mutationFn: (pin: string) => verifyFn({ data: { role, pin } }),
    onSuccess: (res) => {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["pin", role] });
        setInput("");
        setError(false);
      } else {
        setError(true);
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
      }
    },
  });

  if (isLoading) {
    return (
      <div className="mt-12 text-center text-sm text-muted-foreground">
        인증 확인 중…
      </div>
    );
  }
  if (data?.ok) return <>{children}</>;

  return (
    <div className="mt-10 flex justify-center px-4">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-card shadow-cream"
        style={shake ? { animation: "var(--animate-shake)" } : undefined}
      >
        <div className="absolute inset-0 bg-grad-aurora-soft opacity-50 pointer-events-none" />
        <div className="relative p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl ${a.bg} text-white flex items-center justify-center ${a.shadow}`}>
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
              <h2 className="text-base font-extrabold leading-snug">
                {role.toUpperCase()} PIN을 입력하세요
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) verify.mutate(input.trim());
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor={`pin-${role}`} className="text-xs font-bold text-muted-foreground">
              PIN
            </label>
            <input
              ref={inputRef}
              id={`pin-${role}`}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(false);
              }}
              placeholder="PIN"
              className={`w-full rounded-full bg-white/80 border px-4 py-2.5 text-sm outline-none transition ${
                error ? "border-red-400 focus:border-red-500" : "border-white focus:border-primary"
              }`}
            />
            {error && (
              <p className="text-xs font-semibold text-red-600 px-1">PIN이 맞지 않아요</p>
            )}
            <button
              type="submit"
              disabled={!input.trim() || verify.isPending}
              className={`bounce-press mt-1 inline-flex items-center justify-center gap-2 rounded-full ${a.bg} text-white font-bold px-5 py-2.5 ${a.shadow} disabled:opacity-40`}
            >
              <Unlock className="w-4 h-4" />
              {verify.isPending ? "확인 중…" : "잠금 해제"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
