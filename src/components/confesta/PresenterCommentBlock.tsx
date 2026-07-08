import { useState } from "react";
import { MessageCircle, Trash2 } from "lucide-react";
import { RoleBadge } from "./RoleBadge";
import { useToppingCommentThread } from "@/hooks/use-topping-comments";
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
  count: number;
  size?: "sm" | "lg";
  defaultOpen?: boolean;
}

export function PresenterCommentBlock({
  sessionId,
  toppingId,
  count,
  size = "sm",
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const { comments, isFetching, deletePresenterComment } =
    useToppingCommentThread(sessionId, toppingId, open);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const isLg = size === "lg";

  return (
    <div className={isLg ? "mt-4" : "mt-2"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`bounce-press inline-flex items-center gap-1.5 rounded-full font-semibold text-muted-foreground bg-white/70 border border-white hover:text-pink-600 transition-colors ${
          isLg ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
        }`}
        aria-expanded={open}
      >
        <MessageCircle className={isLg ? "w-4 h-4" : "w-3.5 h-3.5"} />
        <span>{count > 0 ? `댓글 ${count}` : "댓글 0"}</span>
      </button>

      {open && (
        <div className={isLg ? "mt-3" : "mt-2"}>
          {comments.length === 0 && isFetching ? (
            <div
              className={`text-muted-foreground ${
                isLg ? "text-sm py-3" : "text-xs py-2"
              }`}
            >
              댓글 불러오는 중…
            </div>
          ) : comments.length === 0 ? (
            <div
              className={`text-muted-foreground ${
                isLg ? "text-sm py-3" : "text-xs py-2"
              }`}
            >
              아직 댓글이 없어요.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-xl bg-white/85 border border-white text-foreground ${
                    isLg ? "px-4 py-3 text-sm" : "px-3 py-2 text-[13px]"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex-1 whitespace-pre-wrap break-words">
                      {c.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(c.id)}
                      aria-label="댓글 삭제"
                      className={`bounce-press shrink-0 inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-red-600 hover:bg-red-50 transition-colors ${
                        isLg ? "w-7 h-7" : "w-6 h-6"
                      }`}
                    >
                      <Trash2 className={isLg ? "w-3.5 h-3.5" : "w-3 h-3"} />
                    </button>
                  </div>
                  <div className="mt-1.5">
                    <RoleBadge role={c.role} size="xs" />
                  </div>
                </li>
              ))}
            </ul>
          )}
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
              발표자 권한으로 삭제합니다. 되돌릴 수 없습니다.
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
                  const r = await deletePresenterComment(id);
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
