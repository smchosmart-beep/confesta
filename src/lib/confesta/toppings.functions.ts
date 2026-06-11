import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SessionIdSchema = z.string().min(1).max(120);
const DeviceIdSchema = z.string().uuid();
const ToppingIdSchema = z.string().uuid();
const PromptIdSchema = z.string().uuid();
const KindSchema = z.enum(["question", "answer"]);

export type ToppingDTO = {
  id: string;
  sessionId: string;
  text: string;
  kind: "question" | "answer";
  promptId: string | null;
  pinned: boolean;
  addressed: boolean;
  likes: number;
  likedByMe: boolean;
  mine: boolean;
  createdAt: number;
};


export const listToppings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        deviceId: DeviceIdSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ toppings: ToppingDTO[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("toppings")
      .select("id, session_id, text, kind, prompt_id, pinned, addressed, likes, created_at, device_id")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    let myLikes = new Set<string>();
    if (data.deviceId && rows && rows.length) {
      const { data: likeRows, error: likeErr } = await supabaseAdmin
        .from("topping_likes")
        .select("topping_id")
        .eq("device_id", data.deviceId)
        .in(
          "topping_id",
          rows.map((r) => r.id),
        );
      if (likeErr) throw likeErr;
      myLikes = new Set((likeRows ?? []).map((l) => l.topping_id));
    }

    return {
      toppings: (rows ?? []).map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        text: r.text,
        kind: r.kind as "question" | "answer",
        promptId: r.prompt_id,
        pinned: r.pinned,
        addressed: r.addressed,
        likes: r.likes,
        likedByMe: myLikes.has(r.id),
        mine: !!data.deviceId && r.device_id === data.deviceId,
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  });

export const deleteOwnTopping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        deviceId: DeviceIdSchema,
        toppingId: ToppingIdSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: selErr } = await supabaseAdmin
      .from("toppings")
      .select("id, device_id, pinned, addressed")
      .eq("id", data.toppingId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (!row || row.device_id !== data.deviceId) {
      return { ok: false as const, message: "본인이 보낸 질문만 삭제할 수 있어요" };
    }
    if (row.pinned || row.addressed) {
      return { ok: false as const, message: "발표자가 다루는 중이라 삭제할 수 없어요" };
    }
    const { error: likeErr } = await supabaseAdmin
      .from("topping_likes")
      .delete()
      .eq("topping_id", data.toppingId);
    if (likeErr) throw likeErr;
    const { error: delErr } = await supabaseAdmin
      .from("toppings")
      .delete()
      .eq("id", data.toppingId)
      .eq("device_id", data.deviceId);
    if (delErr) throw delErr;
    return { ok: true as const };
  });


export const addTopping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        deviceId: DeviceIdSchema,
        sessionId: SessionIdSchema,
        text: z.string().trim().min(1).max(500),
        kind: KindSchema.default("question"),
        promptId: PromptIdSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Gate check
    const { data: gate } = await supabaseAdmin
      .from("topping_gates")
      .select("questions_open, answers_open, active_prompt_id")
      .eq("session_id", data.sessionId)
      .maybeSingle();

    const questionsOpen = gate?.questions_open ?? true;
    const answersOpen = gate?.answers_open ?? false;

    if (data.kind === "question" && !questionsOpen) {
      return { ok: false as const, message: "지금은 질문을 받지 않아요" };
    }

    let resolvedPromptId: string | null = null;
    if (data.kind === "answer") {
      if (!answersOpen) {
        return { ok: false as const, message: "지금은 답변을 받지 않아요" };
      }
      resolvedPromptId = data.promptId ?? gate?.active_prompt_id ?? null;
      if (!resolvedPromptId) {
        return { ok: false as const, message: "활성 답변 질문이 없어요" };
      }
      // Verify prompt belongs to session
      const { data: p } = await supabaseAdmin
        .from("answer_prompts")
        .select("id, session_id")
        .eq("id", resolvedPromptId)
        .maybeSingle();
      if (!p || p.session_id !== data.sessionId) {
        return { ok: false as const, message: "답변 대상 질문을 찾을 수 없어요" };
      }
    }

    const { error } = await supabaseAdmin.from("toppings").insert({
      session_id: data.sessionId,
      device_id: data.deviceId,
      text: data.text,
      kind: data.kind,
      prompt_id: resolvedPromptId,
    });
    if (error) throw error;
    return { ok: true as const };
  });

export const toggleLikeTopping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        deviceId: DeviceIdSchema,
        toppingId: ToppingIdSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("topping_likes")
      .select("topping_id")
      .eq("topping_id", data.toppingId)
      .eq("device_id", data.deviceId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("topping_likes")
        .delete()
        .eq("topping_id", data.toppingId)
        .eq("device_id", data.deviceId);
      if (error) throw error;
    } else {
      const { data: topping } = await supabaseAdmin
        .from("toppings")
        .select("session_id")
        .eq("id", data.toppingId)
        .maybeSingle();
      const { error } = await supabaseAdmin
        .from("topping_likes")
        .insert({
          topping_id: data.toppingId,
          device_id: data.deviceId,
          session_id: topping?.session_id ?? "",
        });
      if (error && error.code !== "23505") throw error;
    }

    // Recount likes from authoritative source
    const { count } = await supabaseAdmin
      .from("topping_likes")
      .select("topping_id", { count: "exact", head: true })
      .eq("topping_id", data.toppingId);

    await supabaseAdmin
      .from("toppings")
      .update({ likes: count ?? 0 })
      .eq("id", data.toppingId);

    return { ok: true as const, liked: !existing, likes: count ?? 0 };
  });

export const togglePinTopping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: SessionIdSchema, toppingId: ToppingIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("toppings")
      .select("pinned, session_id")
      .eq("id", data.toppingId)
      .maybeSingle();
    if (!cur || cur.session_id !== data.sessionId) {
      return { ok: false as const, message: "토핑을 찾을 수 없어요" };
    }
    const next = !(cur.pinned ?? false);
    const { error } = await supabaseAdmin
      .from("toppings")
      .update({ pinned: next })
      .eq("id", data.toppingId);
    if (error) throw error;
    return { ok: true as const, pinned: next };
  });

export const toggleAddressedTopping = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: SessionIdSchema, toppingId: ToppingIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cur } = await supabaseAdmin
      .from("toppings")
      .select("addressed, session_id")
      .eq("id", data.toppingId)
      .maybeSingle();
    if (!cur || cur.session_id !== data.sessionId) {
      return { ok: false as const, message: "토핑을 찾을 수 없어요" };
    }
    const next = !(cur.addressed ?? false);
    const { error } = await supabaseAdmin
      .from("toppings")
      .update({ addressed: next })
      .eq("id", data.toppingId);
    if (error) throw error;
    return { ok: true as const, addressed: next };
  });
