import { createServerFn } from "@tanstack/react-start";
import type { AudienceRole } from "./audienceRole";

export type ExportToppingRow = {
  id: string;
  sessionId: string;
  text: string;
  kind: "question" | "answer";
  promptId: string | null;
  pinned: boolean;
  addressed: boolean;
  likes: number;
  role: AudienceRole | null;
  createdAt: number;
};

export type ExportPromptRow = {
  id: string;
  sessionId: string;
  text: string;
  createdAt: number;
  closedAt: number | null;
};

export type ExportSlotRow = {
  sessionId: string;
  title: string;
  category: string | null;
};

export type ExportAllPayload = {
  toppings: ExportToppingRow[];
  prompts: ExportPromptRow[];
  slots: ExportSlotRow[];
};

const PAGE = 1000;

/** 관리자 전용: 전체 세션의 토핑/발문/슬롯 데이터를 엑셀 내보내기용으로 반환. */
export const exportAllToppings = createServerFn({ method: "POST" }).handler(
  async (): Promise<ExportAllPayload> => {
    const { assertRole } = await import("./assertRole");
    await assertRole("admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const toppings: ExportToppingRow[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from("toppings")
        .select("id, session_id, text, kind, prompt_id, pinned, addressed, likes, role, created_at")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = data ?? [];
      for (const r of rows) {
        toppings.push({
          id: r.id,
          sessionId: r.session_id,
          text: r.text,
          kind: r.kind as "question" | "answer",
          promptId: r.prompt_id,
          pinned: r.pinned,
          addressed: r.addressed,
          likes: r.likes,
          role: r.role,
          createdAt: new Date(r.created_at).getTime(),
        });
      }
      if (rows.length < PAGE) break;
    }

    const { data: promptRows, error: pErr } = await supabaseAdmin
      .from("answer_prompts")
      .select("id, session_id, text, created_at, closed_at")
      .order("created_at", { ascending: true });
    if (pErr) throw pErr;

    const { data: slotRows, error: sErr } = await supabaseAdmin
      .from("session_slots")
      .select("day, period, room, title, category");
    if (sErr) throw sErr;

    return {
      toppings,
      prompts: (promptRows ?? []).map((p) => ({
        id: p.id,
        sessionId: p.session_id,
        text: p.text,
        createdAt: new Date(p.created_at).getTime(),
        closedAt: p.closed_at ? new Date(p.closed_at).getTime() : null,
      })),
      slots: (slotRows ?? []).map((s) => ({
        sessionId: `${s.day}|${s.period}|${s.room}`,
        title: s.title ?? "",
        category: s.category ?? null,
      })),
    };
  },
);
