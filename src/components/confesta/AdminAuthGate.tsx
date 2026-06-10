import { useEffect, useRef, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkPin, verifyPin } from "@/lib/confesta/auth.functions";

interface Props {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: Props) {
  const qc = useQueryClient();
  const checkFn = useServerFn(checkPin);
  const verifyFn = useServerFn(verifyPin);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pin"],
    queryFn: () => checkFn({ data: { role: "admin" } }),
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
    mutationFn: (pin: string) => verifyFn({ data: { role: "admin", pin } }),
    onSuccess: (res) => {
      if (res.ok) {
        qc.invalidateQueries({ queryKey: ["admin-pin"] });
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
            <div className="w-12 h-12 rounded-2xl bg-grad-mango text-white flex items-center justify-center shadow-cream">
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                관리자 인증
              </p>
              <h2 className="text-base font-extrabold leading-snug">
                Admin PIN을 입력하세요
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                주문 QR 발급/재발급 및 행사명 편집을 위해 인증이 필요해요.
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) verify.mutate(input.trim());
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="admin-pin" className="text-xs font-bold text-muted-foreground">
              PIN
            </label>
            <input
              ref={inputRef}
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(false);
              }}
              placeholder="관리자 PIN"
              className={`w-full rounded-full bg-white/80 border px-4 py-2.5 text-sm outline-none transition ${
                error
                  ? "border-red-400 focus:border-red-500"
                  : "border-white focus:border-primary"
              }`}
            />
            {error && (
              <p className="text-xs font-semibold text-red-600 px-1">
                PIN이 맞지 않아요
              </p>
            )}
            <button
              type="submit"
              disabled={!input.trim() || verify.isPending}
              className="bounce-press mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-grad-mango text-white font-bold px-5 py-2.5 shadow-cream disabled:opacity-40"
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
