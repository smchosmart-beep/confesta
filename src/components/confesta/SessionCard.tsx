import type { Session } from "@/lib/confesta/types";
import { getCategory } from "@/lib/confesta/mockData";
import { useConfestaStore } from "@/lib/confesta/store";
import { Check } from "lucide-react";

const FLAVOR_BG: Record<string, string> = {
  mint: "bg-scoop-mint",
  strawberry: "bg-scoop-strawberry",
  mango: "bg-scoop-mango",
  blueberry: "bg-scoop-blueberry",
  chocolate: "bg-scoop-chocolate",
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
  // Simulate dynamic fill — derived from session id for stable mock
  const seed = parseInt(session.id.replace(/\D/g, "")) || 1;
  const baseFilled = Math.min(session.capacity - 2, Math.floor((seed * 7) % session.capacity));
  const filled = Math.min(session.capacity, baseFilled + (enrolled ? 1 : 0));
  const ratio = filled / session.capacity;

  return (
    <div className="bg-card rounded-3xl p-5 shadow-cream border border-border/60 flex flex-col gap-3 bounce-press">
      <div className="flex items-center justify-between">
        <span
          className={`${FLAVOR_BG[cat.flavor]} text-foreground/80 text-xs font-bold px-3 py-1 rounded-full`}
        >
          {cat.label}
        </span>
        <span className="text-xs text-muted-foreground font-medium">
          {session.timeSlot}
        </span>
      </div>

      <h3 className="text-lg font-bold leading-snug">{session.title}</h3>
      <div className="text-sm text-muted-foreground">
        {session.presenter} · {session.room}
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">잔여 좌석</span>
          <span className="font-semibold">
            {filled} / {session.capacity}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${ratio * 100}%`,
              background: `linear-gradient(90deg, var(--secondary), var(--primary))`,
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => toggle(session.id)}
        className={`bounce-press mt-1 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold ${
          enrolled
            ? "bg-primary text-primary-foreground shadow-pink"
            : "bg-muted text-foreground hover:bg-muted/70"
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
