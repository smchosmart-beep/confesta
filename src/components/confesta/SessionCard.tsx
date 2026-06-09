import type { Session } from "@/lib/confesta/types";
import { getCategory } from "@/lib/confesta/mockData";
import { useConfestaStore } from "@/lib/confesta/store";
import { Check } from "lucide-react";
import { ToppingScatter } from "./ToppingDecor";

const FLAVOR_GRAD: Record<string, string> = {
  mint: "bg-grad-mint",
  strawberry: "bg-grad-strawberry",
  mango: "bg-grad-mango",
  blueberry: "bg-grad-blueberry",
  chocolate: "bg-grad-chocolate",
};

interface Props {
  session: Session;
}

export function SessionCard({ session }: Props) {
  const enrolled = useConfestaStore((s) =>
    s.enrolledSessionIds.includes(session.id),
  );
  const toggle = useConfestaStore((s) => s.toggleEnroll);
  const cat = getCategory(session.category);
  const seed = parseInt(session.id.replace(/\D/g, "")) || 1;
  const baseFilled = Math.min(session.capacity - 2, Math.floor((seed * 7) % session.capacity));
  const filled = Math.min(session.capacity, baseFilled + (enrolled ? 1 : 0));
  const ratio = filled / session.capacity;

  return (
    <div className="relative overflow-hidden bg-card rounded-3xl p-5 shadow-cream border border-white/60 flex flex-col gap-3 bounce-press">
      <div className="absolute inset-0 bg-grad-sunset-soft opacity-50" />
      <ToppingScatter density="low" seed={`sc-${session.id}`} />
      <div className="relative flex items-center justify-between">
        <span
          className={`${FLAVOR_GRAD[cat.flavor]} text-white text-xs font-bold px-3 py-1 rounded-full shadow-cream`}
        >
          {cat.label}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {session.timeSlot}
        </span>
      </div>

      <h3 className="relative text-lg font-bold leading-snug">{session.title}</h3>
      <div className="relative text-sm text-muted-foreground">
        {session.presenter} · {session.room}
      </div>

      <div className="relative">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">잔여 좌석</span>
          <span className="font-semibold">
            {filled} / {session.capacity}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-grad-sunset"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => toggle(session.id)}
        className={`relative bounce-press mt-1 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold ${
          enrolled
            ? "bg-grad-strawberry text-white shadow-pink"
            : "bg-grad-muted text-foreground"
        }`}
      >
        {enrolled ? (
          <>
            <Check className="w-4 h-4" /> 신청완료
          </>
        ) : (
          "신청하기"
        )}
      </button>
    </div>
  );
}
