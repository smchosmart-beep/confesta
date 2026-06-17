// 청중 화면 — "토핑 보내기" 카드 위에 표시되는 세션별 자료 카드.
// 등록된 항목이 없으면 아예 렌더링하지 않는다.
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Download, Link2, Paperclip } from "lucide-react";
import { listBookmarks } from "@/lib/confesta/bookmarks.functions";

interface Props {
  sessionId: string | null;
}

export function AudienceBookmarkStrip({ sessionId }: Props) {
  const listFn = useServerFn(listBookmarks);
  const query = useQuery({
    queryKey: ["bookmarks", sessionId],
    queryFn: () => listFn({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  const items = query.data?.items ?? [];
  if (!sessionId || items.length === 0) return null;

  return (
    <div className="relative overflow-hidden bg-card/80 rounded-3xl p-5 shadow-cream border border-white/60">
      <div className="absolute inset-0 bg-grad-aurora-soft opacity-30" />
      <div className="relative">
        <h3 className="font-bold text-base mb-3 flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-primary" />
          바로가기
        </h3>
        <ul className="flex flex-col gap-2">
          {items.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white/70 border border-white/80 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-bold">
                  {b.url && <Link2 className="w-3.5 h-3.5 text-muted-foreground" />}
                  {b.filePath && (
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span className="truncate">{b.title}</span>
                </div>
                {b.fileName && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {b.fileName}
                    {b.fileSize ? ` · ${(b.fileSize / 1024 / 1024).toFixed(2)}MB` : ""}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {b.url && (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bounce-press inline-flex items-center gap-1 rounded-full bg-grad-blueberry text-white px-3 py-1.5 text-xs font-bold shadow-blue"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    링크 열기
                  </a>
                )}
                {b.fileUrl && (
                  <a
                    href={b.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bounce-press inline-flex items-center gap-1 rounded-full bg-grad-strawberry text-white px-3 py-1.5 text-xs font-bold shadow-pink"
                  >
                    <Download className="w-3.5 h-3.5" />
                    파일 다운로드
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
