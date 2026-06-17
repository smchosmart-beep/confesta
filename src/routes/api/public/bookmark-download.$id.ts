// 청중 다운로드 프록시. 원본 한글 파일명을 RFC 5987 방식으로 인코딩해
// Content-Disposition을 설정하므로 브라우저가 UUID가 아닌 원본명으로 저장한다.
import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "session-bookmarks";

function asciiFallback(name: string): string {
  // 비-ASCII와 따옴표를 _로 치환한 안전한 fallback
  return name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "download";
}

export const Route = createFileRoute("/api/public/bookmark-download/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = params.id;
        if (!/^[0-9a-f-]{36}$/i.test(id)) {
          return new Response("Invalid id", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: row, error } = await supabaseAdmin
          .from("session_bookmarks")
          .select("file_path, file_name, file_mime")
          .eq("id", id)
          .maybeSingle();
        if (error) return new Response("Lookup failed", { status: 500 });
        if (!row) return new Response("Not found", { status: 404 });
        if (!row.file_path) return new Response("No file", { status: 400 });

        const { data: blob, error: dlErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .download(row.file_path as string);
        if (dlErr || !blob) return new Response("Download failed", { status: 502 });

        const fileName = (row.file_name as string | null) ?? "download";
        const fallback = asciiFallback(fileName);
        const encoded = encodeURIComponent(fileName);
        const disposition = `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;

        const ab = await blob.arrayBuffer();
        return new Response(ab, {
          status: 200,
          headers: {
            "Content-Type":
              (row.file_mime as string | null) || "application/octet-stream",
            "Content-Disposition": disposition,
            "Content-Length": String(ab.byteLength),
            "Cache-Control": "private, max-age=0, no-store",
          },
        });
      },
    },
  },
});
