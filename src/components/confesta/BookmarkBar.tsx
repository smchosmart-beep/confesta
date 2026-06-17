// 발표자용 북마크 바 — RoleHeader 우측 상단에 표시.
// 등록된 칩 + "+ 바로가기" 추가 다이얼로그(링크/파일 업로드).
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link2, Paperclip, Plus, X, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listBookmarks,
  requestBookmarkUpload,
  createBookmark,
  deleteBookmark,
  deleteBookmarkUpload,
  BOOKMARK_LIMITS,
  type BookmarkDTO,
} from "@/lib/confesta/bookmarks.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BUCKET = "session-bookmarks";
const ACCEPT = BOOKMARK_LIMITS.ALLOWED_EXT.join(",");

interface Props {
  sessionId: string | null;
}

export function BookmarkBar({ sessionId }: Props) {
  const qc = useQueryClient();
  const listFn = useServerFn(listBookmarks);
  const delFn = useServerFn(deleteBookmark);

  const query = useQuery({
    queryKey: ["bookmarks", sessionId],
    queryFn: () => listFn({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 5 * 60_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookmarks", sessionId] });
      toast.success("삭제했어요");
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "삭제 실패";
      toast.error(msg.includes("Unauthorized") ? "세션 잠금을 풀어주세요" : msg);
    },
  });

  const [addOpen, setAddOpen] = useState(false);
  const items = query.data?.items ?? [];

  if (!sessionId) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-full">
      {items.map((b) => (
        <BookmarkChip
          key={b.id}
          item={b}
          onDelete={() => del.mutate(b.id)}
          disabled={del.isPending}
        />
      ))}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/80 bg-white/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-white/70 transition"
      >
        <Plus className="w-3.5 h-3.5" /> 바로가기
      </button>

      {addOpen && (
        <AddBookmarkDialog
          sessionId={sessionId}
          onClose={() => setAddOpen(false)}
          onCreated={() =>
            qc.invalidateQueries({ queryKey: ["bookmarks", sessionId] })
          }
        />
      )}
    </div>
  );
}

function BookmarkChip({
  item,
  onDelete,
  disabled,
}: {
  item: BookmarkDTO;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <span className="group relative inline-flex items-center gap-1 rounded-full bg-grad-aurora-soft border border-white/70 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-cream">
      {item.url && <Link2 className="w-3 h-3 opacity-70" />}
      {item.filePath && <Paperclip className="w-3 h-3 opacity-70" />}
      <span className="max-w-[160px] truncate">{item.title}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`"${item.title}" 바로가기를 삭제할까요?`)) onDelete();
        }}
        disabled={disabled}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-white/80 hover:text-foreground disabled:opacity-50"
        aria-label="삭제"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function AddBookmarkDialog({
  sessionId,
  onClose,
  onCreated,
}: {
  sessionId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const reqUploadFn = useServerFn(requestBookmarkUpload);
  const createFn = useServerFn(createBookmark);
  const delUploadFn = useServerFn(deleteBookmarkUpload);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    if (!BOOKMARK_LIMITS.ALLOWED_EXT.includes(ext)) {
      toast.error(`허용되지 않는 파일 형식: ${ext}`);
      return;
    }
    if (f.size > BOOKMARK_LIMITS.MAX_FILE_SIZE) {
      toast.error(`파일은 ${BOOKMARK_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB 이하만 가능합니다`);
      return;
    }
    setFile(f);
  };

  const tryClose = () => {
    if (submitting) {
      setConfirmCancel(true);
      return;
    }
    onClose();
  };

  const canSubmit =
    title.trim().length > 0 && (url.trim().length > 0 || file !== null) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      const trimmedUrl = url.trim();
      if (trimmedUrl.length > 0 && !/^https?:\/\//i.test(trimmedUrl)) {
        toast.error("URL은 http(s)://로 시작해야 합니다");
        setSubmitting(false);
        return;
      }

      let filePath: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let fileMime: string | undefined;

      if (file) {
        setProgress(0);
        const req = await reqUploadFn({
          data: {
            sessionId,
            fileName: file.name,
            fileMime: file.type || "",
            fileSize: file.size,
          },
        });
        if (!req) throw new Error("업로드 URL 발급 실패");
        uploadedPath = req.filePath;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(req.filePath, req.token, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        if (upErr) throw upErr;
        setProgress(100);
        filePath = req.filePath;
        fileName = req.fileName;
        fileSize = file.size;
        fileMime = file.type || undefined;
      }

      await createFn({
        data: {
          sessionId,
          title: title.trim(),
          url: trimmedUrl.length > 0 ? trimmedUrl : undefined,
          filePath,
          fileName,
          fileSize,
          fileMime,
        },
      });

      toast.success("바로가기를 추가했어요");
      onCreated();
      onClose();
    } catch (e) {
      // orphan 파일 정리
      if (uploadedPath) {
        try {
          await delUploadFn({ data: { sessionId, filePath: uploadedPath } });
        } catch {
          /* noop */
        }
      }
      const msg = e instanceof Error ? e.message : "추가 실패";
      toast.error(
        msg.includes("Unauthorized")
          ? "세션 잠금을 풀어주세요"
          : msg,
      );
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && tryClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>바로가기 추가</DialogTitle>
            <DialogDescription>
              청중 화면에 표시될 외부 링크 또는 파일을 등록하세요. 링크와 파일을
              함께 담을 수도 있어요.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted-foreground">
                버튼 제목 <span className="text-rose-500">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={24}
                placeholder="예: 발표 자료 다운로드"
                disabled={submitting}
              />
              <div className="text-right text-[10px] text-muted-foreground">
                {title.length}/24
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted-foreground">
                링크 주소 (선택)
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                disabled={submitting}
                inputMode="url"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted-foreground">
                파일 (선택, 최대 20MB)
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  disabled={submitting}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  파일 선택
                </Button>
                {file && (
                  <div className="flex-1 min-w-0 flex items-center gap-1 text-xs">
                    <span className="truncate">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      ({(file.size / 1024 / 1024).toFixed(2)}MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={submitting}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="파일 제거"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                허용 형식: PDF, PPT(X), HWP(X), DOC(X), XLS(X), ZIP, PNG, JPG
              </p>
              {progress !== null && (
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-grad-blueberry transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={tryClose} disabled={submitting && progress !== null && progress < 100}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  업로드 중…
                </>
              ) : (
                "확인"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>업로드를 취소할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 업로드가 진행 중입니다. 취소하면 업로드된 파일은 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>계속 업로드</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCancel(false);
                onClose();
              }}
            >
              취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** RoleHeader 외부에 두기 곤란할 때 — interval 폴링 없이 invalidate만 쓰도록 export. */
export function useBookmarkInvalidator() {
  const qc = useQueryClient();
  return (sessionId: string) =>
    qc.invalidateQueries({ queryKey: ["bookmarks", sessionId] });
}

