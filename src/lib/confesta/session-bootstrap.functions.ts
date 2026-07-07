import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AudienceRole } from "./audienceRole";
import type { ToppingDTO } from "./toppings.functions";
import type { AnswerPromptDTO } from "./prompts.functions";
import type { ToppingGateDTO } from "./gates.functions";
import type { CommentDTO } from "./comments.functions";

const SessionIdSchema = z.string().min(1).max(120);
const DeviceIdSchema = z.string().uuid();

const GATE_DEFAULT: Omit<ToppingGateDTO, "sessionId"> = {
  questionsOpen: true,
  answersOpen: false,
  activePromptId: null,
};

export type SessionBootstrapResult = {
  toppings?: { toppings: ToppingDTO[] };
  prompts?: { prompts: AnswerPromptDTO[] };
  gate?: ToppingGateDTO;
  comments?: { comments: CommentDTO[] };
  errors: {
    toppings?: string;
    prompts?: string;
    gate?: string;
    comments?: string;
  };
};

/**
 * 세션 페이지 진입 시 4개 조회(toppings/prompts/gate/comments)를 단일 요청으로 병렬 실행.
 * 각 필드는 try/catch로 격리되어 하나가 실패해도 나머지는 반환되며,
 * 클라이언트는 실패한 키만 기존 훅의 자체 fetch로 폴백함.
 * 새 DB 쿼리 없이 기존 서버함수의 내부 쿼리를 그대로 재현한다.
 */
export const bootstrapSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        deviceId: DeviceIdSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<SessionBootstrapResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sessionId, deviceId } = data;

    const loadToppings = async (): Promise<{ toppings: ToppingDTO[] }> => {
      const { data: rows, error } = await supabaseAdmin.rpc(
        "list_toppings_with_my_like_v2",
        { _session_id: sessionId, _device_id: deviceId, _limit: 100 },
      );
      if (error) throw error;
      const rowsTyped = (rows ?? []) as Array<{
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
      }>;
      return {
        toppings: rowsTyped.map((r) => ({
          id: r.id,
          sessionId: r.session_id,
          text: r.text,
          kind: (r.kind === "answer" ? "answer" : "question") as "question" | "answer",
          promptId: r.prompt_id,
          promptText: r.prompt_text,
          pinned: !!r.pinned,
          addressed: !!r.addressed,
          likes: r.likes ?? 0,
          likedByMe: !!r.liked_by_me,
          mine: r.device_id === deviceId,
          role: (r.role ?? "other") as AudienceRole,
          createdAt: new Date(r.created_at).getTime(),
        })),
      };
    };

    const loadPrompts = async (): Promise<{ prompts: AnswerPromptDTO[] }> => {
      const { data: rows, error } = await supabaseAdmin
        .from("answer_prompts")
        .select("id, session_id, text, created_at, closed_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return {
        prompts: (rows ?? []).map((r) => ({
          id: r.id,
          sessionId: r.session_id,
          text: r.text,
          createdAt: new Date(r.created_at).getTime(),
          closedAt: r.closed_at ? new Date(r.closed_at).getTime() : null,
        })),
      };
    };

    const loadGate = async (): Promise<ToppingGateDTO> => {
      const { data: r, error } = await supabaseAdmin
        .from("topping_gates")
        .select("session_id, questions_open, answers_open, active_prompt_id")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (error) throw error;
      if (!r) return { sessionId, ...GATE_DEFAULT };
      return {
        sessionId: r.session_id,
        questionsOpen: !!r.questions_open,
        answersOpen: !!r.answers_open,
        activePromptId: r.active_prompt_id,
      };
    };

    const loadComments = async (): Promise<{ comments: CommentDTO[] }> => {
      const { data: rows, error } = await supabaseAdmin
        .from("topping_comments")
        .select("id, topping_id, session_id, text, role, device_id, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return {
        comments: (rows ?? []).map((r) => ({
          id: r.id,
          toppingId: r.topping_id,
          sessionId: r.session_id,
          text: r.text,
          role: (r.role ?? "other") as AudienceRole,
          mine: r.device_id === deviceId,
          createdAt: new Date(r.created_at).getTime(),
        })),
      };
    };

    const [t, p, g, c] = await Promise.allSettled([
      loadToppings(),
      loadPrompts(),
      loadGate(),
      loadComments(),
    ]);

    const result: SessionBootstrapResult = { errors: {} };
    if (t.status === "fulfilled") result.toppings = t.value;
    else result.errors.toppings = String(t.reason?.message ?? t.reason ?? "error");
    if (p.status === "fulfilled") result.prompts = p.value;
    else result.errors.prompts = String(p.reason?.message ?? p.reason ?? "error");
    if (g.status === "fulfilled") result.gate = g.value;
    else result.errors.gate = String(g.reason?.message ?? g.reason ?? "error");
    if (c.status === "fulfilled") result.comments = c.value;
    else result.errors.comments = String(c.reason?.message ?? c.reason ?? "error");
    return result;
  });
