import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AUDIENCE_ROLE_KEYS, type AudienceRole } from "./audienceRole";

const SessionIdSchema = z.string().min(1).max(120);
const DeviceIdSchema = z.string().uuid();
const ToppingIdSchema = z.string().uuid();
const PromptIdSchema = z.string().uuid();
const KindSchema = z.enum(["question", "answer"]);
const RoleSchema = z.enum(AUDIENCE_ROLE_KEYS as [string, ...string[]]);

export type ToppingDTO = {
  id: string;
  sessionId: string;
  text: string;
  kind: "question" | "answer";
  promptId: string | null;
  promptText: string | null;
  pinned: boolean;
  addressed: boolean;
  likes: number;
  likedByMe: boolean;
  mine: boolean;
  /** 작성자의 청중 역할. 레거시(NULL) 또는 미지정 시 "other". */
  role: AudienceRole;
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
    // v2: JOIN으로 prompt_text 흡수(N+1 제거), pinned/addressed는 무조건 포함, 나머지는 최신 100건.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc(
      "list_toppings_with_my_like_v2",
      { _session_id: data.sessionId, _device_id: data.deviceId, _limit: 100 },
    );
    if (error) throw error;

    const rowsTyped = ((rows ?? []) as Array<{
      id: string;
      session_id: string;
      text: string;
      kind: string;
      prompt_id: string | null;
      prompt_text: string | null;
      pinned: boolean;
      addressed: boolean;
      likes: number;
      created_at: string;
      device_id: string | null;
      role: AudienceRole | null;
      op_id: string | null;
      liked_by_me: boolean;
    }>);

    return {
      toppings: rowsTyped.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        text: r.text,
        kind: r.kind as "question" | "answer",
        promptId: r.prompt_id,
        promptText: r.prompt_text,
        pinned: r.pinned,
        addressed: r.addressed,
        likes: r.likes,
        likedByMe: r.liked_by_me,
        mine: !!data.deviceId && r.device_id === data.deviceId,
        role: (r.role ?? "other") as AudienceRole,
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  });

/** 관리자 전용: 세션 종료 후 100건 캡 없이 모든 토핑을 조회. */
export const listAllToppingsAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: SessionIdSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ toppings: ToppingDTO[] }> => {
    const { assertRole } = await import("./assertRole");
    await assertRole("admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc(
      "list_all_toppings_admin",
      { _session_id: data.sessionId },
    );
    if (error) throw error;

    const rowsTyped = ((rows ?? []) as Array<{
      id: string;
      session_id: string;
      text: string;
      kind: string;
      prompt_id: string | null;
      prompt_text: string | null;
      pinned: boolean;
      addressed: boolean;
      likes: number;
      created_at: string;
      device_id: string | null;
      role: AudienceRole | null;
      op_id: string | null;
    }>);

    return {
      toppings: rowsTyped.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        text: r.text,
        kind: r.kind as "question" | "answer",
        promptId: r.prompt_id,
        promptText: r.prompt_text,
        pinned: r.pinned,
        addressed: r.addressed,
        likes: r.likes,
        likedByMe: false,
        mine: false,
        role: (r.role ?? "other") as AudienceRole,
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  });


export const listMyToppings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ toppings: ToppingDTO[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("toppings")
      .select("id, session_id, text, kind, prompt_id, pinned, addressed, likes, created_at, device_id, role")
      .eq("device_id", data.deviceId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    const promptIds = Array.from(
      new Set(
        (rows ?? [])
          .filter((r) => r.kind === "answer" && r.prompt_id)
          .map((r) => r.prompt_id as string),
      ),
    );
    const promptTextById = new Map<string, string>();
    if (promptIds.length > 0) {
      const { data: prompts, error: pErr } = await supabaseAdmin
        .from("answer_prompts")
        .select("id, text")
        .in("id", promptIds);
      if (pErr) throw pErr;
      for (const p of prompts ?? []) promptTextById.set(p.id, p.text);
    }

    return {
      toppings: (rows ?? []).map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        text: r.text,
        kind: r.kind as "question" | "answer",
        promptId: r.prompt_id,
        promptText: r.prompt_id ? promptTextById.get(r.prompt_id) ?? null : null,
        pinned: r.pinned,
        addressed: r.addressed,
        likes: r.likes,
        likedByMe: false,
        mine: true,
        role: (r.role ?? "other") as AudienceRole,
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
        role: RoleSchema.optional(),
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

    // 소프트 dedup: 네트워크 재시도/더블 클릭으로 인한 진짜 중복 삽입 방지.
    // 최근 10초 이내 동일 payload(device+session+kind+prompt+text)는 이미 성공한 것으로 취급.
    const sinceIso = new Date(Date.now() - 10_000).toISOString();
    let dedupQ = supabaseAdmin
      .from("toppings")
      .select("id")
      .eq("device_id", data.deviceId)
      .eq("session_id", data.sessionId)
      .eq("kind", data.kind)
      .eq("text", data.text)
      .gte("created_at", sinceIso);
    dedupQ = resolvedPromptId
      ? dedupQ.eq("prompt_id", resolvedPromptId)
      : dedupQ.is("prompt_id", null);
    const { data: dup } = await dedupQ.limit(1).maybeSingle();
    if (dup) return { ok: true as const };

    const { error } = await supabaseAdmin.from("toppings").insert({
      session_id: data.sessionId,
      device_id: data.deviceId,
      text: data.text,
      kind: data.kind,
      prompt_id: resolvedPromptId,
      role: (data.role ?? "other") as "teacher" | "specialist" | "parent" | "other",
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
        opId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // op_id가 있으면 3인자 오버로드로 realtime dedupe 지원, 없으면 기존 2인자 유지.
    const { data: rows, error } = data.opId
      ? await supabaseAdmin.rpc("toggle_topping_like", {
          _topping_id: data.toppingId,
          _device_id: data.deviceId,
          _op_id: data.opId,
        })
      : await supabaseAdmin.rpc("toggle_topping_like", {
          _topping_id: data.toppingId,
          _device_id: data.deviceId,
        });
    if (error) throw error;
    const row = (rows as Array<{ liked: boolean; likes: number }> | null)?.[0];
    return { ok: true as const, liked: !!row?.liked, likes: row?.likes ?? 0 };
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
