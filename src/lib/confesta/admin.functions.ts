import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Period } from "./shared";
import { makeSlotKey } from "./shared";

const PeriodSchema = z.enum(["1000", "1320", "1530"]);
const DaySchema = z.number().int().min(1).max(10);
const RoomSchema = z.string().min(1).max(64);

export type SlotAggregate = {
  orders: number;
  pickups: number;
  toppings: number;
};

export type SlotAggregateMap = Record<string, SlotAggregate>;

export const getSlotAggregates = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ day: DaySchema, period: PeriodSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ aggregates: SlotAggregateMap }> => {
    const { assertRole } = await import("./assertRole");
    await assertRole("admin");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("get_slot_aggregates", {
      _day: data.day,
      _period: data.period as Period,
    });
    if (error) throw error;

    const map: SlotAggregateMap = {};
    for (const r of rows ?? []) {
      map[r.session_id] = {
        orders: r.orders ?? 0,
        pickups: r.pickups ?? 0,
        toppings: r.toppings ?? 0,
      };
    }
    return { aggregates: map };
  });


export const resetSlotData = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        day: DaySchema,
        period: PeriodSchema,
        room: RoomSchema,
        pin: z.string().min(1).max(32),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; sessionId: string }> => {
    const { assertRole } = await import("./assertRole");
    await assertRole("admin");

    const { verifyPinValue } = await import("./pin.server");
    if (!verifyPinValue("admin", data.pin)) {
      throw new Error("INVALID_PIN");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sessionId = makeSlotKey(data.day, data.period as Period, data.room);


    // Delete dependents first (topping_likes references toppings.id).
    const likesRes = await supabaseAdmin
      .from("topping_likes")
      .delete()
      .eq("session_id", sessionId);
    if (likesRes.error) throw likesRes.error;

    const results = await Promise.all([
      supabaseAdmin.from("orders").delete().eq("session_id", sessionId),
      supabaseAdmin.from("scoops").delete().eq("session_id", sessionId),
      supabaseAdmin.from("toppings").delete().eq("session_id", sessionId),
      supabaseAdmin.from("answer_prompts").delete().eq("session_id", sessionId),
      supabaseAdmin.from("topping_gates").delete().eq("session_id", sessionId),
    ]);
    for (const r of results) {
      if (r.error) throw r.error;
    }

    return { ok: true, sessionId };
  });
