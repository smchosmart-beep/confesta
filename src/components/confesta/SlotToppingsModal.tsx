import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSessionToppings } from "@/hooks/use-toppings";
import { AnswerPie } from "./AnswerPie";
import type { ToppingDTO } from "@/lib/confesta/toppings.functions";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  title: string;
}

export function SlotToppingsModal({ open, onClose, sessionId, title }: Props) {
  const { toppings } = useSessionToppings(open ? sessionId : null);

  const questions = useMemo(
    () =>
      toppings
        .filter((t) => t.kind === "question")
        .sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt),
    [toppings],
  );

  const answerGroups = useMemo(() => {
    const map = new Map<
      string,
      { promptId: string | null; promptText: string | null; items: ToppingDTO[] }
    >();
    for (const t of toppings) {
      if (t.kind !== "answer") continue;
      const key = t.promptId ?? "__unclassified__";
      if (!map.has(key)) {
        map.set(key, {
          promptId: t.promptId,
          promptText: t.promptText,
          items: [],
        });
      }
      map.get(key)!.items.push(t);
    }
    const groups = Array.from(map.values());
    for (const g of groups) g.items.sort((a, b) => b.createdAt - a.createdAt);
    // unclassified 마지막으로
    groups.sort((a, b) => {
      if (a.promptId == null) return 1;
      if (b.promptId == null) return -1;
      return b.items.length - a.items.length;
    });
    return groups;
  }, [toppings]);

  const totalToppings = questions.length + answerGroups.reduce((s, g) => s + g.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🍦 {title}</span>
            <span className="text-xs font-bold rounded-full bg-grad-mango/20 text-grad-mango px-2 py-0.5">
              토핑 {totalToppings}
            </span>
          </DialogTitle>
          <DialogDescription>
            이 공간에 도착한 질문과 키워드 응답을 한눈에 확인할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        {totalToppings === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            아직 도착한 토핑이 없어요 🍒
          </div>
        ) : (
          <div className="space-y-6">
            {/* 질문 토핑 */}
            <section>
              <h3 className="text-sm font-extrabold mb-2 flex items-center gap-2">
                <span>❓ 질문 토핑</span>
                <span className="text-[10px] font-bold rounded-full bg-grad-blueberry/15 text-grad-blueberry px-2 py-0.5">
                  {questions.length}
                </span>
              </h3>
              {questions.length === 0 ? (
                <p className="text-xs text-muted-foreground">아직 질문이 없어요.</p>
              ) : (
                <ul className="space-y-1.5">
                  {questions.map((q) => (
                    <li
                      key={q.id}
                      className="rounded-lg border border-border bg-card/60 px-3 py-2 flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-wrap break-words">{q.text}</p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold rounded-full bg-muted px-1.5 py-0.5 tabular-nums">
                            ❤ {q.likes}
                          </span>
                          {q.pinned && (
                            <span className="text-[10px] font-bold rounded-full bg-grad-strawberry/20 text-grad-strawberry px-1.5 py-0.5">
                              📌 핀
                            </span>
                          )}
                          {q.addressed && (
                            <span className="text-[10px] font-bold rounded-full bg-grad-mint/20 text-grad-mint px-1.5 py-0.5">
                              ✅ 완료
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 키워드 응답 토핑 */}
            <section>
              <h3 className="text-sm font-extrabold mb-2 flex items-center gap-2">
                <span>💬 키워드 응답</span>
                <span className="text-[10px] font-bold rounded-full bg-grad-mango/20 text-grad-mango px-2 py-0.5">
                  {answerGroups.reduce((s, g) => s + g.items.length, 0)}
                </span>
              </h3>
              {answerGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">아직 응답이 없어요.</p>
              ) : (
                <div className="space-y-4">
                  {answerGroups.map((g, gi) => (
                    <div
                      key={g.promptId ?? `unclassified-${gi}`}
                      className="rounded-xl border border-border bg-card/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold">
                          {g.promptText ?? "분류되지 않은 응답"}
                        </h4>
                        <span className="text-[10px] font-bold rounded-full bg-muted px-2 py-0.5 shrink-0">
                          {g.items.length}개
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                          {g.items.map((a) => (
                            <li
                              key={a.id}
                              className="text-xs rounded-md bg-muted/50 px-2 py-1.5"
                            >
                              <span className="font-semibold text-muted-foreground">
                                {g.promptText ?? "응답"}
                              </span>{" "}
                              <span className="text-muted-foreground">-</span>{" "}
                              <span className="whitespace-pre-wrap break-words">{a.text}</span>
                            </li>
                          ))}
                        </ul>
                        {g.promptId ? (
                          <div className="min-h-[260px]">
                            <AnswerPie sessionId={sessionId} promptId={g.promptId} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-xs text-muted-foreground">
                            분류되지 않은 응답은 통계를 표시하지 않아요
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
