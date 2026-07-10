import { useMemo, useState } from "react";
import { Pin, Check, Heart, Maximize2 } from "lucide-react";
import { usePresenterToppings } from "@/hooks/use-toppings";
import type { ToppingDTO } from "@/lib/confesta/toppings.functions";
import { AUDIENCE_ROLES, type AudienceRole } from "@/lib/confesta/audienceRole";
import { RoleBadge } from "./RoleBadge";
import { QuestionSpotlightModal } from "./QuestionSpotlightModal";
import { PresenterCommentBlock } from "./PresenterCommentBlock";
import { useToppingCommentCounts } from "@/hooks/use-topping-comments";

type Filter = "all" | "pinned" | "unaddressed" | "addressed";
type Sort = "recent" | "likes";
type RoleFilter = "all" | AudienceRole;

interface Props {
  sessionId: string;
}

export function QuestionStream({ sessionId }: Props) {
  const { toppings: allToppings, togglePin, toggleAddressed } = usePresenterToppings(sessionId);
  const { getCount } = useToppingCommentCounts(sessionId);
  const toppings = useMemo(
    () => allToppings.filter((t) => t.kind !== "answer"),
    [allToppings],
  );

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [spotlight, setSpotlight] = useState<ToppingDTO | null>(null);

  const filtered = useMemo(() => {
    let list = [...toppings];
    if (filter === "pinned") list = list.filter((t) => t.pinned);
    else if (filter === "unaddressed") list = list.filter((t) => !t.addressed);
    else if (filter === "addressed") list = list.filter((t) => t.addressed);

    if (roleFilter !== "all") list = list.filter((t) => t.role === roleFilter);

    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sort === "likes") return (b.likes ?? 0) - (a.likes ?? 0);
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [toppings, filter, sort, roleFilter]);

  const roleCounts = useMemo(() => {
    const m = new Map<AudienceRole, number>();
    for (const t of toppings) m.set(t.role, (m.get(t.role) ?? 0) + 1);
    return m;
  }, [toppings]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: `전체 ${toppings.length}` },
    { value: "pinned", label: `핀 ${toppings.filter((t) => t.pinned).length}` },
    {
      value: "unaddressed",
      label: `미답변 ${toppings.filter((t) => !t.addressed).length}`,
    },
    { value: "addressed", label: `답변완료 ${toppings.filter((t) => t.addressed).length}` },
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

      <div className="inline-flex flex-wrap gap-1 p-1 bg-muted rounded-full shadow-cream mb-4">
        <button
          type="button"
          onClick={() => setRoleFilter("all")}
          className={`bounce-press rounded-full px-3 py-1.5 text-xs font-semibold ${
            roleFilter === "all"
              ? "bg-primary text-primary-foreground shadow-pink"
              : "text-foreground/70"
          }`}
        >
          전체 역할
        </button>
        {AUDIENCE_ROLES.map((r) => {
          const count = roleCounts.get(r.key) ?? 0;
          const active = roleFilter === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRoleFilter(r.key)}
              className={`bounce-press rounded-full px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1 ${
                active ? `${r.bg} text-white shadow-pink` : "text-foreground/70"
              }`}
              aria-pressed={active}
            >
              <span aria-hidden>{r.emoji}</span>
              {r.ko}
              <span className="tabular-nums opacity-80">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-3xl p-10 text-center text-muted-foreground border border-border">
          조건에 맞는 질문이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const likes = t.likes ?? 0;
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
                <div className="relative mt-2">
                  <RoleBadge role={t.role} size="xs" />
                </div>
                <div className="relative mt-3 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Heart className="w-3.5 h-3.5 text-primary fill-current" />
                    <span className="font-mono font-semibold">{likes}</span>
                    <span>·</span>
                    <span suppressHydrationWarning>
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
                <div className="relative">
                  <PresenterCommentBlock
                    sessionId={sessionId}
                    toppingId={t.id}
                    count={getCount(t.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <QuestionSpotlightModal
        topping={spotlight}
        sessionId={sessionId}
        commentCount={spotlight ? getCount(spotlight.id) : 0}
        onClose={() => setSpotlight(null)}
        onPrev={() => {
          if (!spotlight) return;
          const idx = filtered.findIndex((t) => t.id === spotlight.id);
          if (idx === -1) return;
          const prevIdx = idx === 0 ? filtered.length - 1 : idx - 1;
          setSpotlight(filtered[prevIdx]);
        }}
        onNext={() => {
          if (!spotlight) return;
          const idx = filtered.findIndex((t) => t.id === spotlight.id);
          if (idx === -1) return;
          const nextIdx = idx === filtered.length - 1 ? 0 : idx + 1;
          setSpotlight(filtered[nextIdx]);
        }}
      />
    </div>
  );
}
