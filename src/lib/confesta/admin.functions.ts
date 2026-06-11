import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Period } from "./shared";

const PeriodSchema = z.enum(["1000", "1320", "1530"]);
const DaySchema = z.number().int().min(1).max(10);

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
    const prefix = `${data.day}|${data.period as Period}|`;

    const [ordersRes, scoopsRes, toppingsRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("session_id, picked_up_at")
        .like("session_id", `${prefix}%`),
      supabaseAdmin
        .from("scoops")
        .select("session_id")
        .like("session_id", `${prefix}%`),
      supabaseAdmin
        .from("toppings")
        .select("session_id")
        .like("session_id", `${prefix}%`),
    ]);
    if (ordersRes.error) throw ordersRes.error;
    if (scoopsRes.error) throw scoopsRes.error;
    if (toppingsRes.error) throw toppingsRes.error;

    const map: SlotAggregateMap = {};
    const get = (key: string): SlotAggregate => {
      let v = map[key];
      if (!v) {
        v = { orders: 0, pickups: 0, toppings: 0 };
        map[key] = v;
      }
      return v;
    };

    for (const o of ordersRes.data ?? []) {
      const agg = get(o.session_id);
      agg.orders += 1;
      if (o.picked_up_at) agg.pickups += 1;
    }
    for (const t of toppingsRes.data ?? []) {
      get(t.session_id).toppings += 1;
    }
    // scoops are tracked but not used for pickup count (picked_up_at is source of truth).
    void scoopsRes;

    return { aggregates: map };
  });
