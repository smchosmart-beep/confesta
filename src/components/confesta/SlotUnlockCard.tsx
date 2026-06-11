import { useEffect, useRef, useState } from "react";
import { Lock, Unlock, ArrowLeft, KeyRound } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { unlockPresenterSlot } from "@/lib/confesta/presenter.functions";
import type { Period } from "@/lib/confesta/shared";

interface Props {
  day: number;
  period: Period;
  room: string;
  title: string;
  hasPresenterPassword: boolean;
  onUnlocked: () => void;
  onPickAnother?: () => void;
}

export function SlotUnlockCard({
  day,
  period,
  room,
  title,
  hasPresenterPassword,
  onUnlocked,
  onPickAnother,
}: Props) {
  const unlockFn = useServerFn(unlockPresenterSlot);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInput("");
    setError(null);
    setShake(false);
    inputRef.current?.focus();
  }, [day, period, room]);

  const unlock = useMutation({
    mutationFn: (password: string) =>
      unlockFn({ data: { day, period, room, password } }),
    onSuccess: (res) => {
      if (res.ok) {
        onUnlocked();
        return;
      }
      setError(
        res.reason === "unset"
          ? "관리자가 아직 발표자 비밀번호를 설정하지 않았어요"
          : "비밀번호가 맞지 않아요",
      );
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    },
    onError: () => {
      setError("인증 중 오류가 발생했어요");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || unlock.isPending) return;
    unlock.mutate(input);
  };

  return (
    <div className="mt-6 flex justify-center px-3">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-card shadow-cream"
        style={shake ? { animation: "var(--animate-shake)" } : undefined}
      >
        <div className="absolute inset-0 bg-grad-aurora-soft opacity-50 pointer-events-none" />
        <div className="relative p-6 sm:p-8 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-grad-strawberry text-white flex items-center justify-center shadow-pink">
              <Lock className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                발표자 인증
              </p>
              <h2 className="text-base font-extrabold leading-snug truncate">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Day {day} · {period === "am" ? "오전" : "오후"} · {room}
              </p>
            </div>
          </div>

          {hasPresenterPassword ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <label
                htmlFor="slot-password"
                className="text-xs font-bold text-muted-foreground"
              >
                세션 비밀번호
              </label>
              <input
                ref={inputRef}
                id="slot-password"
                type="password"
                autoComplete="off"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="관리자에게 받은 비밀번호"
                className={`w-full rounded-full bg-white/80 border px-4 py-2.5 text-sm outline-none transition ${
                  error
                    ? "border-red-400 focus:border-red-500"
                    : "border-white focus:border-primary"
                }`}
              />
              {error && (
                <p className="text-xs font-semibold text-red-600 px-1">{error}</p>
              )}
              <button
                type="submit"
                disabled={!input.trim() || unlock.isPending}
                className="bounce-press mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-grad-strawberry text-white font-bold px-5 py-2.5 shadow-pink disabled:opacity-40 disabled:hover:scale-100"
              >
                <Unlock className="w-4 h-4" />
                {unlock.isPending ? "확인 중…" : "잠금 해제"}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-900">
                <p className="font-bold mb-0.5">비밀번호 미설정</p>
                <p>관리자에게 이 세션의 발표자 비밀번호 설정을 요청해 주세요.</p>
              </div>
            </div>
          )}

          {onPickAnother && (
            <button
              type="button"
              onClick={onPickAnother}
              className="bounce-press inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              다른 세션 선택
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
