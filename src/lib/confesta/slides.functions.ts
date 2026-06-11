import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SlideStateDTO = {
  slideIndex: number;
  slideTotal: number;
  paused: boolean;
  updatedAt: number;
};

const DEFAULT: SlideStateDTO = {
  slideIndex: 0,
  slideTotal: 30,
  paused: false,
  updatedAt: 0,
};

export const getSlideState = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({}).optional().parse(input))
  .handler(async (): Promise<SlideStateDTO> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin
      .from("slide_state")
      .select("slide_index, slide_total, paused, updated_at")
      .eq("id", "singleton")
      .maybeSingle();
    if (!r) return DEFAULT;
    return {
      slideIndex: r.slide_index,
      slideTotal: r.slide_total,
      paused: r.paused,
      updatedAt: new Date(r.updated_at).getTime(),
    };
  });

export const setSlideState = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slideIndex: z.number().int().min(0).max(10000).optional(),
        slideTotal: z.number().int().min(1).max(10000).optional(),
        paused: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // 슬라이드 컨트롤은 전역 싱글톤이라 admin PIN으로 보호
    const { assertRole } = await import("./assertRole");
    await assertRole("admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load current
    const { data: cur } = await supabaseAdmin
      .from("slide_state")
      .select("slide_index, slide_total, paused")
      .eq("id", "singleton")
      .maybeSingle();
    const next = {
      id: "singleton",
      slide_index: data.slideIndex ?? cur?.slide_index ?? 0,
      slide_total: data.slideTotal ?? cur?.slide_total ?? 30,
      paused: typeof data.paused === "boolean" ? data.paused : cur?.paused ?? false,
      updated_at: new Date().toISOString(),
    };
    // Clamp index
    next.slide_index = Math.max(0, Math.min(next.slide_index, Math.max(0, next.slide_total - 1)));

    const { error } = await supabaseAdmin
      .from("slide_state")
      .upsert(next, { onConflict: "id" });
    if (error) throw error;
    return {
      ok: true as const,
      state: {
        slideIndex: next.slide_index,
        slideTotal: next.slide_total,
        paused: next.paused,
        updatedAt: Date.now(),
      } satisfies SlideStateDTO,
    };
  });
