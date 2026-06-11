import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SessionIdSchema = z.string().min(1).max(120);

export type ToppingGateDTO = {
  sessionId: string;
  questionsOpen: boolean;
  answersOpen: boolean;
  activePromptId: string | null;
};

const DEFAULT: Omit<ToppingGateDTO, "sessionId"> = {
  questionsOpen: true,
  answersOpen: false,
  activePromptId: null,
};

export const getToppingGate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: SessionIdSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<ToppingGateDTO> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin
      .from("topping_gates")
      .select("session_id, questions_open, answers_open, active_prompt_id")
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (!r) return { sessionId: data.sessionId, ...DEFAULT };
    return {
      sessionId: r.session_id,
      questionsOpen: r.questions_open,
      answersOpen: r.answers_open,
      activePromptId: r.active_prompt_id,
    };
  });

export const setToppingGate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        questionsOpen: z.boolean().optional(),
        answersOpen: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { assertPresenterSlot } = await import("./assertRole");
    await assertPresenterSlot(data.sessionId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: {
      session_id: string;
      updated_at: string;
      questions_open?: boolean;
      answers_open?: boolean;
    } = { session_id: data.sessionId, updated_at: new Date().toISOString() };
    if (typeof data.questionsOpen === "boolean") patch.questions_open = data.questionsOpen;
    if (typeof data.answersOpen === "boolean") patch.answers_open = data.answersOpen;

    const { error } = await supabaseAdmin
      .from("topping_gates")
      .upsert(patch, { onConflict: "session_id" });
    if (error) throw error;
    return { ok: true as const };
  });
