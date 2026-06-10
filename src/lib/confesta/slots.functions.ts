import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { makeOrderQR, makeSlotKey, type Period } from "./shared";

const PeriodSchema = z.enum(["am", "pm"]);
const DaySchema = z.number().int().min(1).max(10);
const RoomSchema = z.string().min(1).max(64);
const TitleSchema = z.string().max(120);

async function assertAdmin() {
  const { verifyCookieValue, cookieName } = await import("./pin.server");
  const v = getCookie(cookieName("admin"));
  if (!verifyCookieValue("admin", v)) {
    throw new Error("Unauthorized: admin PIN required");
  }
}

function newNonce() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export type SlotDTO = {
  day: number;
  period: Period;
  room: string;
  title: string;
  hasOrderQR: boolean;
  orderPayload: string | null;
  orderRotatedAt: number | null;
};

async function loadSlots(day: number, period: Period): Promise<SlotDTO[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [slotsRes, noncesRes] = await Promise.all([
    supabaseAdmin
      .from("session_slots")
      .select("day, period, room, title")
      .eq("day", day)
      .eq("period", period),
    supabaseAdmin
      .from("session_nonces")
      .select("session_id, kind, nonce, rotated_at")
      .eq("kind", "order"),
  ]);
  if (slotsRes.error) throw slotsRes.error;
  if (noncesRes.error) throw noncesRes.error;

  const nonceMap = new Map<string, { nonce: string; rotated_at: string }>();
  for (const n of noncesRes.data ?? []) {
    nonceMap.set(n.session_id, { nonce: n.nonce, rotated_at: n.rotated_at });
  }

  return (slotsRes.data ?? []).map((s) => {
    const key = makeSlotKey(s.day, s.period as Period, s.room);
    const hit = nonceMap.get(key);
    return {
      day: s.day,
      period: s.period as Period,
      room: s.room,
      title: s.title ?? "",
      hasOrderQR: !!hit,
      orderPayload: hit ? makeOrderQR(key, hit.nonce) : null,
      orderRotatedAt: hit ? new Date(hit.rotated_at).getTime() : null,
    };
  });
}

export const listSlots = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ day: DaySchema, period: PeriodSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    return { slots: await loadSlots(data.day, data.period) };
  });

export const upsertSlotTitle = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        day: DaySchema,
        period: PeriodSchema,
        room: RoomSchema,
        title: TitleSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("session_slots").upsert(
      {
        day: data.day,
        period: data.period,
        room: data.room,
        title: data.title,
      },
      { onConflict: "day,period,room" },
    );
    if (error) throw error;
    return { ok: true as const };
  });

export const issueOrderQR = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ day: DaySchema, period: PeriodSchema, room: RoomSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = makeSlotKey(data.day, data.period, data.room);

    // ensure slot row exists so listSlots includes it
    await supabaseAdmin
      .from("session_slots")
      .upsert(
        { day: data.day, period: data.period, room: data.room },
        { onConflict: "day,period,room", ignoreDuplicates: true },
      );

    // return existing nonce if present, otherwise create
    const { data: existing } = await supabaseAdmin
      .from("session_nonces")
      .select("nonce")
      .eq("session_id", key)
      .eq("kind", "order")
      .maybeSingle();

    if (existing) {
      return { ok: true as const, payload: makeOrderQR(key, existing.nonce) };
    }

    const nonce = newNonce();
    const { error } = await supabaseAdmin
      .from("session_nonces")
      .insert({ session_id: key, kind: "order", nonce });
    if (error) throw error;
    return { ok: true as const, payload: makeOrderQR(key, nonce) };
  });

export const rotateOrderQR = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ day: DaySchema, period: PeriodSchema, room: RoomSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = makeSlotKey(data.day, data.period, data.room);
    const nonce = newNonce();
    const { error } = await supabaseAdmin
      .from("session_nonces")
      .upsert(
        { session_id: key, kind: "order", nonce, rotated_at: new Date().toISOString() },
        { onConflict: "session_id,kind" },
      );
    if (error) throw error;
    return { ok: true as const, payload: makeOrderQR(key, nonce) };
  });
