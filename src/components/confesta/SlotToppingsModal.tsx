import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listAllToppingsAdmin } from "@/lib/confesta/toppings.functions";
import { useDeleteTopping } from "@/hooks/use-delete-topping";
import { AnswerPie } from "./AnswerPie";
import type { ToppingDTO } from "@/lib/confesta/toppings.functions";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  title: string;
}

export function SlotToppingsModal({ open, onClose, sessionId, title }: Props) {
  // 관리자 전용: 100건 하드캡 없이 세션의 모든 토핑을 조회.
  const listFn = useServerFn(listAllToppingsAdmin);
  const { data } = useQuery({
    queryKey: ["admin-toppings", sessionId],
    queryFn: () => listFn({ data: { sessionId } }),
    enabled: open,
    staleTime: 15_000,
  });
  const toppings: ToppingDTO[] = data?.toppings ?? [];

  const [pendingId, setPendingId] = useState<string | null>(null);
  const del = useDeleteTopping();

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

  const confirmDelete = () => {
    if (!pendingId) return;
    del.mutate(
      { sessionId, toppingId: pendingId },
      { onSettled: () => setPendingId(null) },
    );
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-screen-2xl max-h-[85vh] overflow-y-auto">
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
                      <button
                        type="button"
                        onClick={() => setPendingId(q.id)}
                        aria-label="질문 삭제"
                        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                              className="group text-xs rounded-md bg-muted/50 px-2 py-1.5 flex items-start gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-muted-foreground">
                                  {g.promptText ?? "응답"}
                                </span>{" "}
                                <span className="text-muted-foreground">-</span>{" "}
                                <span className="whitespace-pre-wrap break-words">{a.text}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPendingId(a.id)}
                                aria-label="응답 삭제"
                                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity opacity-0 group-hover:opacity-100 focus-within:opacity-100 focus:opacity-100"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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

    <AlertDialog
      open={pendingId !== null}
      onOpenChange={(o) => {
        if (!o && !del.isPending) setPendingId(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>이 토핑을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            삭제 후에는 되돌릴 수 없어요. 청중/발표자 화면에서도 즉시 사라집니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={del.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirmDelete();
            }}
            disabled={del.isPending}
          >
            {del.isPending ? "삭제 중…" : "삭제"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
