import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  useConfestaStore,
  getToppingGate,
  getActiveAnswerPrompt,
} from "@/lib/confesta/store";
import {
  MessageSquare,
  Hash,
  Megaphone,
  X,
  RotateCcw,
  Trash2,
  Check,
  Plus,
} from "lucide-react";

interface Props {
  sessionId: string;
}

export function ToppingGateControl({ sessionId }: Props) {
  const gates = useConfestaStore((s) => s.toppingGates);
  const setGate = useConfestaStore((s) => s.setToppingGate);
  const toppings = useConfestaStore((s) => s.toppings);
  const answerPrompts = useConfestaStore((s) => s.answerPrompts);
  const createAnswerPrompt = useConfestaStore((s) => s.createAnswerPrompt);
  const updateAnswerPrompt = useConfestaStore((s) => s.updateAnswerPrompt);
  const closeAnswerPrompt = useConfestaStore((s) => s.closeAnswerPrompt);
  const reopenAnswerPrompt = useConfestaStore((s) => s.reopenAnswerPrompt);
  const deleteAnswerPrompt = useConfestaStore((s) => s.deleteAnswerPrompt);

  const gate = getToppingGate(gates, sessionId);
  const active = getActiveAnswerPrompt(answerPrompts, sessionId);

  const sessionPrompts = useMemo(
    () =>
      answerPrompts
        .filter((p) => p.sessionId === sessionId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [answerPrompts, sessionId],
  );
  const closedPrompts = sessionPrompts.filter((p) => p.closedAt != null);

  const counts = useMemo(() => {
    let q = 0;
    let a = 0;
    for (const t of toppings) {
      if (t.sessionId !== sessionId) continue;
      if (t.kind === "answer") a++;
      else q++;
    }
    return { q, a };
  }, [toppings, sessionId]);

  const answersByPrompt = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of toppings) {
      if (t.kind !== "answer" || !t.promptId) continue;
      map.set(t.promptId, (map.get(t.promptId) ?? 0) + 1);
    }
    return map;
  }, [toppings]);

  const [newPromptText, setNewPromptText] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(
    null,
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newPromptText.trim();
    if (!text) return;
    const hadActive = active != null;
    const created = createAnswerPrompt(sessionId, text);
    if (created) {
      setNewPromptText("");
      if (hadActive) toast("이전 질문은 보관함으로 옮겼어요 (응답은 계속 받아요)");
      else toast.success("새 키워드 질문을 시작했어요");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-card shadow-cream p-4">
      <div className="absolute inset-0 bg-grad-aurora-soft opacity-30 pointer-events-none" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold">청중 토핑 입력 제어</h3>
          <span className="text-[11px] font-mono text-muted-foreground">
            질문 {counts.q} · 응답 {counts.a}
          </span>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-white/60 border border-white/70 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="w-4 h-4 text-primary" />
            질문 받기
          </span>
          <Switch
            checked={gate.questionsOpen}
            onCheckedChange={(v) => setGate(sessionId, { questionsOpen: v })}
          />
        </label>

        <div className="rounded-xl bg-white/60 border border-white/70 px-3 py-2 flex flex-col gap-2">
          <label className="flex items-center justify-between gap-3">
            <span className="inline-flex flex-col">
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Hash className="w-4 h-4 text-primary" />
                키워드 응답 받기
              </span>
              <span className="text-[10px] text-muted-foreground pl-6">
                모든 질문(보관 포함)의 응답 수신을 한 번에 켜고 끕니다
              </span>
            </span>
            <Switch
              checked={gate.answersOpen}
              onCheckedChange={(v) => setGate(sessionId, { answersOpen: v })}
              disabled={sessionPrompts.length === 0}
            />
          </label>

          {/* Active prompt panel */}
          {active ? (
            <div className="rounded-xl bg-grad-sunset-soft border border-white/70 px-3 py-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-pink-700 shrink-0" />
                <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider">
                  활성 질문 · 응답 {answersByPrompt.get(active.id) ?? 0}
                </span>
              </div>
              {editing?.id === active.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editing.text}
                    onChange={(e) =>
                      setEditing({ id: active.id, text: e.target.value })
                    }
                    maxLength={60}
                    autoFocus
                    className="flex-1 rounded-full bg-card border border-white/80 px-3 py-1.5 text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateAnswerPrompt(active.id, editing.text);
                      setEditing(null);
                    }}
                    className="bounce-press inline-flex items-center justify-center rounded-full bg-grad-strawberry text-white w-7 h-7 shadow-pink"
                    aria-label="저장"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="bounce-press inline-flex items-center justify-center rounded-full bg-white/80 text-muted-foreground border border-white w-7 h-7"
                    aria-label="취소"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({ id: active.id, text: active.text })
                    }
                    className="flex-1 text-left text-sm font-semibold text-foreground hover:underline"
                    title="클릭하여 수정"
                  >
                    {active.text}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeAnswerPrompt(active.id);
                      toast("질문을 보관함으로 옮겼어요");
                    }}
                    className="bounce-press inline-flex items-center gap-1 rounded-full bg-white/80 border border-white px-2.5 py-1 text-[11px] font-bold text-pink-700 hover:bg-white"
                  >
                    <X className="w-3 h-3" />
                    보관
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground px-1">
              아직 활성 질문이 없어요. 아래에서 새 질문을 시작하세요.
            </p>
          )}

          {/* New prompt input */}
          <form onSubmit={handleCreate} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder={
                active ? "다음 질문 (보내면 현재 질문 보관)" : "발문 예: 가장 인상 깊은 단어 한 개"
              }
              maxLength={60}
              className="flex-1 rounded-full bg-card border border-white/80 px-3 py-1.5 text-xs outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!newPromptText.trim()}
              className="bounce-press inline-flex items-center gap-1 rounded-full bg-grad-strawberry text-white px-3 py-1.5 text-[11px] font-bold shadow-pink disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {active ? "다음 질문" : "질문 시작"}
            </button>
          </form>

          {/* History */}
          {closedPrompts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold text-muted-foreground px-1 mt-1">
                보관된 질문 · {closedPrompts.length} <span className="font-normal">(응답 계속 수신 중)</span>
              </div>
              <ul className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                {closedPrompts.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-xl bg-white/70 border border-white px-3 py-1.5"
                  >
                    <span className="flex-1 text-xs text-foreground/80 truncate">
                      {p.text}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {answersByPrompt.get(p.id) ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        reopenAnswerPrompt(p.id);
                        toast("질문을 다시 진행 중으로 옮겼어요");
                      }}
                      className="bounce-press inline-flex items-center justify-center rounded-full bg-white border border-white/80 w-6 h-6 text-muted-foreground hover:text-pink-600"
                      aria-label="다시 활성화"
                      title="다시 활성화"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            "이 질문과 받은 응답을 모두 삭제할까요? 되돌릴 수 없어요.",
                          )
                        )
                          deleteAnswerPrompt(p.id);
                      }}
                      className="bounce-press inline-flex items-center justify-center rounded-full bg-white border border-white/80 w-6 h-6 text-muted-foreground hover:text-red-500"
                      aria-label="삭제"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
