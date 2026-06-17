// Session bookmarks — 발표자가 등록하는 세션별 외부 링크/파일 바로가기.
// 모든 쓰기는 supabaseAdmin + assertPresenterSlot 검증을 거친다.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- 공통 상수 / 검증 ----------

const BUCKET = "session-bookmarks";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_PER_SESSION = 8;
const SIGNED_DOWNLOAD_TTL = 30 * 60; // 30분
const LIST_CACHE_TTL_MS = 60_000; // 60초 in-memory 캐시

const ALLOWED_EXT = new Set([
  ".pdf", ".ppt", ".pptx", ".hwp", ".hwpx",
  ".doc", ".docx", ".xls", ".xlsx", ".zip",
  ".png", ".jpg", ".jpeg",
]);

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/x-hwp",
  "application/haansofthwp",
  "application/vnd.hancom.hwp",
  "application/haansofthwpx",
  "application/vnd.hancom.hwpx",
  "application/zip",
  "image/png",
  "image/jpeg",
]);

function getExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

// Supabase Storage 객체 키는 영문/숫자/`._-/` 위주만 안전. 세션 ID에 `|` 같은
// 특수문자가 들어있어도 안전하게 폴더명으로 쓰기 위해 base64url로 인코딩한다.
function sessionFolder(sessionId: string): string {
  // 안전 문자만으로 구성된 경우 그대로 둔다 (가독성 + 기존 데이터 호환)
  if (/^[A-Za-z0-9._-]+$/.test(sessionId)) return sessionId;
  // btoa는 latin1만 지원 → UTF-8 안전 인코딩
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(sessionId, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(sessionId)));
  return "s_" + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sanitizeFileName(raw: string): string {
  // 위험 문자 제거 + 길이 cap. 저장소 키 규칙에 맞춰 일부 특수문자도 치환.
  const cleaned = raw
    .replace(/[\\/\x00]/g, "_")
    .replace(/[|<>:"?*]/g, "_")
    .replace(/\.\.+/g, ".")
    .trim();
  if (cleaned.length === 0) return "file";
  return cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
}


function validateFileAttrs(fileName: string, fileMime: string, fileSize: number) {
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    throw new Error("파일 크기는 1 byte~20 MB여야 합니다.");
  }
  const ext = getExt(fileName);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error(`허용되지 않는 파일 형식입니다: ${ext || "(확장자 없음)"}`);
  }
  // MIME: 비어있거나 화이트리스트면 OK (hwp는 브라우저가 못 알아채는 경우 多)
  if (fileMime && fileMime.length > 0 && !ALLOWED_MIME.has(fileMime)) {
    throw new Error(`허용되지 않는 MIME 형식: ${fileMime}`);
  }
}

const SessionIdSchema = z.string().min(1).max(128);

const TitleSchema = z.string().trim().min(1, "제목을 입력하세요").max(24, "최대 24자");
const UrlSchema = z
  .string()
  .trim()
  .max(500, "URL이 너무 깁니다")
  .regex(/^https?:\/\//i, "http(s):// 로 시작해야 합니다");

// ---------- listBookmarks 60초 in-memory 캐시 ----------

type BookmarkDTO = {
  id: string;
  title: string;
  url: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMime: string | null;
  fileUrl: string | null;
  sortOrder: number;
  createdAt: string;
};

const listCache = new Map<string, { at: number; data: BookmarkDTO[] }>();

function invalidateListCache(sessionId: string) {
  listCache.delete(sessionId);
}

// ---------- 서버 함수 ----------

/** 공개. 세션의 북마크 목록 + 파일이 있는 항목은 30분 서명 다운로드 URL 동봉. */
export const listBookmarks = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: SessionIdSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ items: BookmarkDTO[] }> => {
    const sessionId = data.sessionId;
    const now = Date.now();
    const cached = listCache.get(sessionId);
    if (cached && now - cached.at < LIST_CACHE_TTL_MS) {
      return { items: cached.data };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("session_bookmarks")
      .select("id,title,url,file_path,file_name,file_size,file_mime,sort_order,created_at")
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;

    const items: BookmarkDTO[] = [];
    for (const r of rows ?? []) {
      const fileUrl: string | null = r.file_path
        ? `/api/public/bookmark-download/${r.id as string}`
        : null;
      items.push({
        id: r.id as string,
        title: r.title as string,
        url: (r.url as string | null) ?? null,
        filePath: (r.file_path as string | null) ?? null,
        fileName: (r.file_name as string | null) ?? null,
        fileSize: (r.file_size as number | null) ?? null,
        fileMime: (r.file_mime as string | null) ?? null,
        fileUrl,
        sortOrder: (r.sort_order as number) ?? 0,
        createdAt: r.created_at as string,
      });
    }


    listCache.set(sessionId, { at: now, data: items });
    return { items };
  });

/** 발표자: 업로드용 서명 URL 발급. 브라우저가 직접 PUT한다. */
export const requestBookmarkUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        fileName: z.string().min(1).max(255),
        fileMime: z.string().max(255).optional().default(""),
        fileSize: z.number().int().positive().max(MAX_FILE_SIZE),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);

    const safeName = sanitizeFileName(data.fileName);
    validateFileAttrs(safeName, data.fileMime ?? "", data.fileSize);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 세션당 상한 사전 체크
    const { count, error: countErr } = await supabaseAdmin
      .from("session_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("session_id", data.sessionId);
    if (countErr) throw countErr;
    if ((count ?? 0) >= MAX_PER_SESSION) {
      throw new Error(`세션당 최대 ${MAX_PER_SESSION}개까지 등록할 수 있어요.`);
    }

    // path 생성 + 서명 업로드 URL 발급. 저장소 객체 키는 ASCII-safe 값만 사용하고,
    // 실제 표시/다운로드 파일명은 DB의 fileName으로 보존한다. 충돌 시 1회 retry.
    const folder = sessionFolder(data.sessionId);
    const tryOnce = async () => {
      const uuid = crypto.randomUUID();
      const filePath = `${folder}/${uuid}${getExt(safeName)}`;
      const { data: signed, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUploadUrl(filePath);
      if (error) return { error };
      return {
        result: {
          uploadUrl: signed.signedUrl,
          token: signed.token,
          filePath,
          fileName: safeName,
        },
      };
    };

    const first = await tryOnce();
    if ("result" in first) return first.result;
    const second = await tryOnce();
    if ("result" in second) return second.result;
    throw second.error!;
  });


/** 발표자: 북마크 행 생성. 파일이 있으면 storage에 실제 객체가 있는지도 확인. */
export const createBookmark = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        title: TitleSchema,
        url: z.string().trim().optional().nullable(),
        filePath: z.string().trim().optional().nullable(),
        fileName: z.string().trim().optional().nullable(),
        fileSize: z.number().int().positive().optional().nullable(),
        fileMime: z.string().trim().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);

    const title = data.title.trim();
    let url: string | null = null;
    if (data.url && data.url.length > 0) {
      url = UrlSchema.parse(data.url);
    }

    let filePath: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let fileMime: string | null = null;

    const hasAnyFileField =
      !!(data.filePath || data.fileName || data.fileSize || data.fileMime);

    if (hasAnyFileField) {
      if (!data.filePath || !data.fileName || !data.fileSize) {
        throw new Error("파일 정보가 불완전합니다.");
      }
      // 세션 폴더 접두사 검증 (sessionFolder로 인코딩된 경로)
      const folder = sessionFolder(data.sessionId);
      if (!data.filePath.startsWith(`${folder}/`)) {
        throw new Error("잘못된 파일 경로입니다.");
      }

      validateFileAttrs(data.fileName, data.fileMime ?? "", data.fileSize);
      filePath = data.filePath;
      fileName = data.fileName;
      fileSize = data.fileSize;
      fileMime = data.fileMime && data.fileMime.length > 0 ? data.fileMime : null;
    }

    if (!url && !filePath) {
      throw new Error("링크 또는 파일 중 하나 이상이 필요합니다.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 상한 재확인
    const { count, error: countErr } = await supabaseAdmin
      .from("session_bookmarks")
      .select("id", { count: "exact", head: true })
      .eq("session_id", data.sessionId);
    if (countErr) throw countErr;
    if ((count ?? 0) >= MAX_PER_SESSION) {
      throw new Error(`세션당 최대 ${MAX_PER_SESSION}개까지 등록할 수 있어요.`);
    }

    // 파일 존재 확인 (위조 방지)
    if (filePath) {
      const dirIdx = filePath.indexOf("/");
      const dir = filePath.slice(0, dirIdx);
      const base = filePath.slice(dirIdx + 1);
      const { data: list, error: listErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(dir, { search: base, limit: 1 });
      if (listErr) throw listErr;
      const exists = (list ?? []).some((o) => o.name === base);
      if (!exists) {
        throw new Error("업로드된 파일을 찾을 수 없습니다.");
      }
    }

    // sort_order = 기존 max + 1
    const { data: maxRow } = await supabaseAdmin
      .from("session_bookmarks")
      .select("sort_order")
      .eq("session_id", data.sessionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = ((maxRow?.sort_order as number | undefined) ?? 0) + 1;

    const { data: inserted, error } = await supabaseAdmin
      .from("session_bookmarks")
      .insert({
        session_id: data.sessionId,
        title,
        url,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        file_mime: fileMime,
        sort_order: nextOrder,
      })
      .select("id")
      .single();
    if (error) throw error;

    invalidateListCache(data.sessionId);
    return { ok: true as const, id: inserted.id as string };
  });

/** 발표자: 업로드는 됐지만 createBookmark가 실패/취소된 orphan 파일 정리. */
export const deleteBookmarkUpload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        filePath: z.string().min(1).max(512),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);
    if (!data.filePath.startsWith(`${sessionFolder(data.sessionId)}/`)) {
      throw new Error("잘못된 파일 경로입니다.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(BUCKET).remove([data.filePath]);
    return { ok: true as const };
  });

/** 발표자: 북마크 삭제(+ 파일이 있으면 storage 객체도 삭제). */
export const deleteBookmark = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: selErr } = await supabaseAdmin
      .from("session_bookmarks")
      .select("id, session_id, file_path")
      .eq("id", data.id)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!row) return { ok: true as const };

    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(row.session_id as string);

    if (row.file_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([row.file_path as string]);
    }
    const { error } = await supabaseAdmin
      .from("session_bookmarks")
      .delete()
      .eq("id", data.id);
    if (error) throw error;

    invalidateListCache(row.session_id as string);
    return { ok: true as const };
  });

export type { BookmarkDTO };
export const BOOKMARK_LIMITS = {
  MAX_FILE_SIZE,
  MAX_PER_SESSION,
  ALLOWED_EXT: Array.from(ALLOWED_EXT),
};
