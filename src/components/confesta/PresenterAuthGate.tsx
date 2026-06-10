import { useEffect, useRef, useState } from "react";
import { Lock, Unlock, ArrowLeft } from "lucide-react";
import type { Session } from "@/lib/confesta/types";

interface Props {
  session: Session;
  onUnlock: () => void;
  onPickAnother?: () => void;
}

export function PresenterAuthGate({ session, onUnlock, onPickAnother }: Props) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 세션이 바뀌면 입력 리셋
  useEffect(() => {
    setInput("");
    setError(false);
    setShake(false);
    inputRef.current?.focus();
  }, [session.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === session.presenterPassword) {
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      window.setTimeout(() => setShake(false), 450);
    }
  };

  return (
    <div className="mt-6 flex justify-center">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border border-white/60 bg-card shadow-cream ${
          shake ? "animate-shake" : ""
        }`}
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
                {session.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {session.presenter} · {session.room} · {session.timeSlot}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label
              htmlFor="presenter-password"
              className="text-xs font-bold text-muted-foreground"
            >
              비밀번호
            </label>
            <input
              ref={inputRef}
              id="presenter-password"
              type="password"
              autoComplete="off"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(false);
              }}
              placeholder="세션 비밀번호를 입력하세요"
              className={`w-full rounded-full bg-white/80 border px-4 py-2.5 text-sm outline-none transition ${
                error
                  ? "border-red-400 focus:border-red-500"
                  : "border-white focus:border-primary"
              }`}
            />
            {error && (
              <p className="text-xs font-semibold text-red-600 px-1">
                비밀번호가 맞지 않아요
              </p>
            )}
            <button
              type="submit"
              disabled={!input.trim()}
              className="bounce-press mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-grad-strawberry text-white font-bold px-5 py-2.5 shadow-pink disabled:opacity-40 disabled:hover:scale-100"
            >
              <Unlock className="w-4 h-4" />
              잠금 해제
            </button>
          </form>

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

          {/* 데모 편의 — 운영에서는 제거 */}
          <div className="rounded-2xl bg-white/60 border border-dashed border-white/80 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="font-bold text-foreground">데모 비밀번호</span>:{" "}
            <code className="font-mono text-foreground">
              {session.presenterPassword}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
