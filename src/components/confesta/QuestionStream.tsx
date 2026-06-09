import { useMemo, useState } from "react";
import { Pin, Check, Heart, Maximize2 } from "lucide-react";
import { useConfestaStore } from "@/lib/confesta/store";
import type { Topping } from "@/lib/confesta/types";
import { QuestionSpotlightModal } from "./QuestionSpotlightModal";

type Filter = "all" | "pinned" | "unaddressed" | "addressed";
type Sort = "recent" | "likes";

interface Props {
  sessionId: string;
}

// Stable mock likes — derived from id hash so they don't flicker on rerender
function mockLikes(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 47;
}

export function QuestionStream({ sessionId }: Props) {
  const allToppings = useConfestaStore((s) => s.toppings);
  const toppings = useMemo(
    () => allToppings.filter((t) => t.sessionId === sessionId),
    [allToppings, sessionId],
  );
  const togglePin = useConfestaStore((s) => s.togglePinTopping);
  const toggleAddressed = useConfestaStore((s) => s.toggleAddressedTopping);

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [spotlight, setSpotlight] = useState<Topping | null>(null);

  const filtered = useMemo(() => {
    let list = [...toppings];
    if (filter === "pinned") list = list.filter((t) => t.pinned);
    else if (filter === "unaddressed") list = list.filter((t) => !t.addressed);
    else if (filter === "addressed") list = list.filter((t) => t.addressed);

    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sort === "likes") return mockLikes(b.id) - mockLikes(a.id);
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [toppings, filter, sort]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: `전체 ${toppings.length}` },
    { value: "pinned", label: `핀 ${toppings.filter((t) => t.pinned).length}` },
    {
      value: "unaddressed",
      label: `미답변 ${toppings.filter((t) => !t.addressed).length}`,
    },
    { value: "addressed", label: "답변완료" },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
        <div className="inline-flex flex-wrap gap-1 p-1 bg-muted rounded-full shadow-cream">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`bounce-press rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === f.value
                  ? "bg-primary text-primary-foreground shadow-pink"
                  : "text-foreground/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setSort(sort === "recent" ? "likes" : "recent")}
          className="bounce-press text-xs font-semibold bg-card border border-border rounded-full px-3 py-1.5"
        >
          정렬: {sort === "recent" ? "최신순" : "좋아요순"}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-3xl p-10 text-center text-muted-foreground border border-border">
          조건에 맞는 질문이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const likes = mockLikes(t.id);
            return (
              <div
                key={t.id}
                className={`relative overflow-hidden border-2 rounded-2xl p-4 shadow-cream transition ${
                  t.addressed ? "opacity-60" : ""
                } ${t.pinned ? "border-transparent bg-grad-sunset-soft" : "border-white/60 bg-card"}`}
              >
                {t.pinned && (
                  <div className="absolute inset-0 bg-grad-sunset-soft opacity-50 pointer-events-none" />
                )}
                <p
                  className={`relative text-sm font-medium ${
                    t.addressed ? "line-through" : ""
                  }`}
                >
                  {t.text}
                </p>
                <div className="relative mt-3 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Heart className="w-3.5 h-3.5 text-primary fill-current" />
                    <span className="font-mono font-semibold">{likes}</span>
                    <span>·</span>
                    <span>
                      {new Date(t.createdAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSpotlight(t)}
                      className="bounce-press bg-grad-muted rounded-full p-1.5"
                      aria-label="크게 보기"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePin(t.id)}
                      className={`bounce-press rounded-full p-1.5 ${
                        t.pinned
                          ? "bg-grad-strawberry text-white shadow-pink"
                          : "bg-grad-muted"
                      }`}
                      aria-label="상단 고정"
                    >
                      <Pin
                        className={`w-3.5 h-3.5 ${t.pinned ? "fill-current" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAddressed(t.id)}
                      className={`bounce-press rounded-full p-1.5 ${
                        t.addressed
                          ? "bg-grad-success text-white"
                          : "bg-grad-muted"
                      }`}
                      aria-label="답변 완료"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QuestionSpotlightModal
        topping={spotlight}
        onClose={() => setSpotlight(null)}
      />
    </div>
  );
}
