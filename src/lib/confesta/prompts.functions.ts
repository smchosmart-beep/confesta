import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SessionIdSchema = z.string().min(1).max(120);
const PromptIdSchema = z.string().uuid();

export type AnswerPromptDTO = {
  id: string;
  sessionId: string;
  text: string;
  createdAt: number;
  closedAt: number | null;
};

function toDTO(r: {
  id: string;
  session_id: string;
  text: string;
  created_at: string;
  closed_at: string | null;
}): AnswerPromptDTO {
  return {
    id: r.id,
    sessionId: r.session_id,
    text: r.text,
    createdAt: new Date(r.created_at).getTime(),
    closedAt: r.closed_at ? new Date(r.closed_at).getTime() : null,
  };
}

/** Look up session id for a prompt, then assert presenter slot auth. */
async function assertForPrompt(promptId: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: p } = await supabaseAdmin
    .from("answer_prompts")
    .select("session_id")
    .eq("id", promptId)
    .maybeSingle();
  if (!p) throw new Error("프롬프트를 찾을 수 없어요");
  const { assertPresenterSlot } = await import("./assertRole");
  await assertPresenterSlot(p.session_id);
  return p.session_id;
}

export const listAnswerPrompts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: SessionIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("answer_prompts")
      .select("id, session_id, text, created_at, closed_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { prompts: (rows ?? []).map(toDTO) };
  });

async function setActivePrompt(sessionId: string, promptId: string | null, answersOpen?: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const patch: {
    session_id: string;
    active_prompt_id: string | null;
    updated_at: string;
    answers_open?: boolean;
  } = {
    session_id: sessionId,
    active_prompt_id: promptId,
    updated_at: new Date().toISOString(),
  };
  if (typeof answersOpen === "boolean") patch.answers_open = answersOpen;
  await supabaseAdmin.from("topping_gates").upsert(patch, { onConflict: "session_id" });
}

export const createAnswerPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        text: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Close any currently open prompts for this session
    await supabaseAdmin
      .from("answer_prompts")
      .update({ closed_at: new Date().toISOString() })
      .eq("session_id", data.sessionId)
      .is("closed_at", null);

    const { data: inserted, error } = await supabaseAdmin
      .from("answer_prompts")
      .insert({ session_id: data.sessionId, text: data.text })
      .select("id, session_id, text, created_at, closed_at")
      .single();
    if (error) throw error;

    await setActivePrompt(data.sessionId, inserted.id, true);
    return { ok: true as const, prompt: toDTO(inserted) };
  });

export const updateAnswerPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        promptId: PromptIdSchema,
        text: z.string().trim().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertForPrompt(data.promptId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("answer_prompts")
      .update({ text: data.text })
      .eq("id", data.promptId);
    if (error) throw error;
    return { ok: true as const };
  });

export const closeAnswerPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ promptId: PromptIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const sessionId = await assertForPrompt(data.promptId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("answer_prompts")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", data.promptId);
    if (error) throw error;
    await supabaseAdmin
      .from("topping_gates")
      .update({ active_prompt_id: null, updated_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("active_prompt_id", data.promptId);
    return { ok: true as const };
  });

export const reopenAnswerPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ promptId: PromptIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const sessionId = await assertForPrompt(data.promptId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Close other open prompts in same session
    await supabaseAdmin
      .from("answer_prompts")
      .update({ closed_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .is("closed_at", null)
      .neq("id", data.promptId);

    const { error } = await supabaseAdmin
      .from("answer_prompts")
      .update({ closed_at: null })
      .eq("id", data.promptId);
    if (error) throw error;

    await setActivePrompt(sessionId, data.promptId, true);
    return { ok: true as const };
  });

export const deleteAnswerPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ promptId: PromptIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    const sessionId = await assertForPrompt(data.promptId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("toppings").delete().eq("prompt_id", data.promptId);
    const { error } = await supabaseAdmin
      .from("answer_prompts")
      .delete()
      .eq("id", data.promptId);
    if (error) throw error;
    await supabaseAdmin
      .from("topping_gates")
      .update({ active_prompt_id: null, updated_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("active_prompt_id", data.promptId);
    return { ok: true as const };
  });
