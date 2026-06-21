import { useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { RoleBadge } from "./RoleBadge";
import { useSessionToppingComments } from "@/hooks/use-topping-comments";
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
import { toast } from "sonner";

interface Props {
  sessionId: string;
  toppingId: string;
}

const MAX_LEN = 200;

export function QuestionCommentBlock({ sessionId, toppingId }: Props) {
  const { commentsByTopping, canWrite, addComment, deleteOwnComment } =
    useSessionToppingComments(sessionId);
  const list = commentsByTopping.get(toppingId) ?? [];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleSubmit = async () => {
    const t = text.trim();
    if (!t || !canWrite) return;
    setSubmitting(true);
    try {
      await addComment(toppingId, t.slice(0, MAX_LEN));
      setText("");
    } catch (e) {
      toast.error("댓글을 보내지 못했어요");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="bounce-press inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground bg-white/70 border border-white hover:text-pink-600 transition-colors"
        aria-expanded={open}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>{list.length > 0 ? `댓글 ${list.length}` : "댓글 달기"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          {list.length > 0 && (
            <ul className="flex flex-col gap-2">
              {list.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl bg-white/85 border border-white px-3 py-2 text-[13px] text-foreground"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-1 whitespace-pre-wrap break-words">
                      {c.text}
                    </span>
                    {c.mine && (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(c.id)}
                        aria-label="내 댓글 삭제"
                        className="bounce-press shrink-0 inline-flex items-center justify-center rounded-full w-6 h-6 text-muted-foreground/70 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5">
                    <RoleBadge role={c.role} size="xs" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-xl bg-white/85 border border-white px-3 py-2 flex flex-col gap-1.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              rows={2}
              disabled={!canWrite || submitting}
              placeholder={
                canWrite ? "댓글을 남겨보세요" : "역할을 먼저 선택해 주세요"
              }
              className="resize-none w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none disabled:opacity-60"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {text.length}/{MAX_LEN}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canWrite || submitting || text.trim().length === 0}
                className="bounce-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white bg-grad-strawberry shadow-pink disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                보내기
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 댓글을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제하면 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const id = pendingDeleteId;
                setPendingDeleteId(null);
                if (!id) return;
                try {
                  const r = await deleteOwnComment(id);
                  if (!r?.ok) {
                    toast.error(r?.message ?? "삭제할 수 없어요");
                  }
                } catch {
                  toast.error("삭제 중 오류가 발생했어요");
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
