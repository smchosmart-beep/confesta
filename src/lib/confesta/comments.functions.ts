import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AUDIENCE_ROLE_KEYS, type AudienceRole } from "./audienceRole";

const SessionIdSchema = z.string().min(1).max(120);
const DeviceIdSchema = z.string().uuid();
const ToppingIdSchema = z.string().uuid();
const CommentIdSchema = z.string().uuid();
const RoleSchema = z.enum(AUDIENCE_ROLE_KEYS as [string, ...string[]]);
const TextSchema = z.string().trim().min(1).max(200);

export type CommentAuthorKind = "audience" | "presenter";

export type CommentDTO = {
  id: string;
  toppingId: string;
  sessionId: string;
  text: string;
  role: AudienceRole;
  mine: boolean;
  createdAt: number;
  authorKind: CommentAuthorKind;
};

export const listToppingComments = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        deviceId: DeviceIdSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ comments: CommentDTO[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("topping_comments")
      .select("id, topping_id, session_id, text, role, device_id, created_at, author_kind")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return {
      comments: (rows ?? []).map((r) => ({
        id: r.id,
        toppingId: r.topping_id,
        sessionId: r.session_id,
        text: r.text,
        role: (r.role ?? "other") as AudienceRole,
        mine: !!data.deviceId && r.device_id === data.deviceId,
        createdAt: new Date(r.created_at).getTime(),
        authorKind: (r.author_kind === "presenter" ? "presenter" : "audience") as CommentAuthorKind,
      })),
    };
  });

export const listToppingCommentCounts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: SessionIdSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ counts: Record<string, number> }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc(
      "count_comments_by_session",
      { _session_id: data.sessionId },
    );
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const r of (rows ?? []) as Array<{ topping_id: string; cnt: number }>) {
      counts[r.topping_id] = r.cnt;
    }
    return { counts };
  });

export const listCommentsByTopping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        toppingId: ToppingIdSchema,
        deviceId: DeviceIdSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ comments: CommentDTO[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("topping_comments")
      .select("id, topping_id, session_id, text, role, device_id, created_at")
      .eq("topping_id", data.toppingId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return {
      comments: (rows ?? []).map((r) => ({
        id: r.id,
        toppingId: r.topping_id,
        sessionId: r.session_id,
        text: r.text,
        role: (r.role ?? "other") as AudienceRole,
        mine: !!data.deviceId && r.device_id === data.deviceId,
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  });

export const addToppingComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        deviceId: DeviceIdSchema,
        sessionId: SessionIdSchema,
        toppingId: ToppingIdSchema,
        text: TextSchema,
        role: RoleSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // 토핑이 해당 세션에 속하는지 검증
    const { data: top, error: tErr } = await supabaseAdmin
      .from("toppings")
      .select("id, session_id")
      .eq("id", data.toppingId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!top || top.session_id !== data.sessionId) {
      return { ok: false as const, message: "질문을 찾을 수 없어요" };
    }
    const { error } = await supabaseAdmin.from("topping_comments").insert({
      topping_id: data.toppingId,
      session_id: data.sessionId,
      device_id: data.deviceId,
      role: data.role as "teacher" | "specialist" | "parent" | "other",
      text: data.text,
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const deleteOwnToppingComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        deviceId: DeviceIdSchema,
        commentId: CommentIdSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur, error: gErr } = await supabaseAdmin
      .from("topping_comments")
      .select("id, device_id")
      .eq("id", data.commentId)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!cur) return { ok: false as const, message: "댓글을 찾을 수 없어요" };
    if (cur.device_id !== data.deviceId) {
      return { ok: false as const, message: "본인 댓글만 삭제할 수 있어요" };
    }
    const { error } = await supabaseAdmin
      .from("topping_comments")
      .delete()
      .eq("id", data.commentId);
    if (error) throw error;
    return { ok: true as const };
  });

export const deletePresenterToppingComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        commentId: CommentIdSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("topping_comments")
      .select("id, session_id")
      .eq("id", data.commentId)
      .maybeSingle();
    if (!cur || cur.session_id !== data.sessionId) {
      return { ok: false as const, message: "댓글을 찾을 수 없어요" };
    }
    const { error } = await supabaseAdmin
      .from("topping_comments")
      .delete()
      .eq("id", data.commentId);
    if (error) throw error;
    return { ok: true as const };
  });
