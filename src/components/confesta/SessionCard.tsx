import type { Session } from "@/lib/confesta/types";
import { getCategory } from "@/lib/confesta/mockData";
import { displayRoom } from "@/lib/confesta/shared";
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
  const cat = getCategory(session.category);

  return (
    <div className="relative overflow-hidden bg-card rounded-3xl p-5 shadow-cream border border-white/60 flex flex-col gap-3">
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
        {session.presenter} · {displayRoom(session.room)}
      </div>
    </div>
  );
}
