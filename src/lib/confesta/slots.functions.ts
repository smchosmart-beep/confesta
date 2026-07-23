import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { makeOrderQR, makePickupQR, makeSlotKey, type Period } from "./shared";
import type { CategoryKey } from "./types";

const CATEGORY_KEYS = [
  "vision-keynote",
  "conference",
  "class-share",
  "networking",
  "leader-school",
  "parents",
  "hackathon",
] as const;
const CategorySchema = z.enum(CATEGORY_KEYS).nullable();

const PeriodSchema = z.enum(["1000", "1320", "1530"]);
const DaySchema = z.number().int().min(1).max(10);
const RoomSchema = z.string().min(1).max(64);
const TitleSchema = z.string().max(120);


async function assertAdmin() {
  const { assertRole } = await import("./assertRole");
  await assertRole("admin");
}

async function assertPresenterSlotKey(day: number, period: Period, room: string) {
  const { assertPresenterSlot } = await import("./assertRole");
  await assertPresenterSlot(makeSlotKey(day, period, room));
}

function newNonce() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export type SlotDTO = {
  day: number;
  period: Period;
  room: string;
  title: string;
  category: CategoryKey | null;
  hasOrderQR: boolean;
  orderPayload: string | null;
  orderRotatedAt: number | null;
  hasPickupQR: boolean;
  pickupPayload: string | null;
  pickupRotatedAt: number | null;
  hasPresenterPassword: boolean;
};

async function loadSlots(day: number, period: Period): Promise<SlotDTO[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [slotsRes, noncesRes, secretsRes] = await Promise.all([
    supabaseAdmin
      .from("session_slots")
      .select("day, period, room, title, category")

      .eq("day", day)
      .eq("period", period),
    supabaseAdmin
      .from("session_nonces")
      .select("session_id, kind, nonce, rotated_at")
      .in("kind", ["order", "pickup"]),
    supabaseAdmin.from("session_secrets").select("session_id"),
  ]);
  if (slotsRes.error) throw slotsRes.error;
  if (noncesRes.error) throw noncesRes.error;
  if (secretsRes.error) throw secretsRes.error;

  const nonceMap = new Map<string, { nonce: string; rotated_at: string }>();
  for (const n of noncesRes.data ?? []) {
    nonceMap.set(`${n.kind}:${n.session_id}`, { nonce: n.nonce, rotated_at: n.rotated_at });
  }
  const secretsSet = new Set((secretsRes.data ?? []).map((r) => r.session_id));

  return (slotsRes.data ?? []).map((s) => {
    const key = makeSlotKey(s.day, s.period as Period, s.room);
    const order = nonceMap.get(`order:${key}`);
    const pickup = nonceMap.get(`pickup:${key}`);
    return {
      day: s.day,
      period: s.period as Period,
      room: s.room,
      title: s.title ?? "",
      hasOrderQR: !!order,
      orderPayload: order ? makeOrderQR(key, order.nonce) : null,
      orderRotatedAt: order ? new Date(order.rotated_at).getTime() : null,
      hasPickupQR: !!pickup,
      pickupPayload: pickup ? makePickupQR(key, pickup.nonce) : null,
      pickupRotatedAt: pickup ? new Date(pickup.rotated_at).getTime() : null,
      hasPresenterPassword: secretsSet.has(key),
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

export type IssuedSlotDTO = {
  day: number;
  period: Period;
  room: string;
  title: string;
  hasPresenterPassword: boolean;
};

export const listIssuedSlots = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [slotsRes, noncesRes, secretsRes] = await Promise.all([
      supabaseAdmin.from("session_slots").select("day, period, room, title"),
      supabaseAdmin
        .from("session_nonces")
        .select("session_id, kind")
        .eq("kind", "order"),
      supabaseAdmin.from("session_secrets").select("session_id"),
    ]);
    if (slotsRes.error) throw slotsRes.error;
    if (noncesRes.error) throw noncesRes.error;
    if (secretsRes.error) throw secretsRes.error;
    const issued = new Set((noncesRes.data ?? []).map((n) => n.session_id));
    const secretsSet = new Set((secretsRes.data ?? []).map((r) => r.session_id));
    const slots: IssuedSlotDTO[] = (slotsRes.data ?? [])
      .filter(
        (s) =>
          (s.title ?? "").trim().length > 0 &&
          issued.has(makeSlotKey(s.day, s.period as Period, s.room)),
      )
      .map((s) => {
        const key = makeSlotKey(s.day, s.period as Period, s.room);
        return {
          day: s.day,
          period: s.period as Period,
          room: s.room,
          title: s.title ?? "",
          hasPresenterPassword: secretsSet.has(key),
        };
      })
      .sort(
        (a, b) =>
          a.day - b.day ||
          a.period.localeCompare(b.period) ||
          a.room.localeCompare(b.room),
      );
    return { slots };
  },
);


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

export const issuePickupQR = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ day: DaySchema, period: PeriodSchema, room: RoomSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertPresenterSlotKey(data.day, data.period, data.room);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = makeSlotKey(data.day, data.period, data.room);

    await supabaseAdmin
      .from("session_slots")
      .upsert(
        { day: data.day, period: data.period, room: data.room },
        { onConflict: "day,period,room", ignoreDuplicates: true },
      );

    const { data: existing } = await supabaseAdmin
      .from("session_nonces")
      .select("nonce")
      .eq("session_id", key)
      .eq("kind", "pickup")
      .maybeSingle();

    if (existing) {
      return { ok: true as const, payload: makePickupQR(key, existing.nonce) };
    }

    const nonce = newNonce();
    const { error } = await supabaseAdmin
      .from("session_nonces")
      .insert({ session_id: key, kind: "pickup", nonce });
    if (error) throw error;
    return { ok: true as const, payload: makePickupQR(key, nonce) };
  });

export const rotatePickupQR = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ day: DaySchema, period: PeriodSchema, room: RoomSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertPresenterSlotKey(data.day, data.period, data.room);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = makeSlotKey(data.day, data.period, data.room);
    const nonce = newNonce();
    const { error } = await supabaseAdmin
      .from("session_nonces")
      .upsert(
        { session_id: key, kind: "pickup", nonce, rotated_at: new Date().toISOString() },
        { onConflict: "session_id,kind" },
      );
    if (error) throw error;
    return { ok: true as const, payload: makePickupQR(key, nonce) };
  });

export const getOrderQRForPresenter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({ day: DaySchema, period: PeriodSchema, room: RoomSchema })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await assertPresenterSlotKey(data.day, data.period, data.room);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = makeSlotKey(data.day, data.period, data.room);
    const { data: existing } = await supabaseAdmin
      .from("session_nonces")
      .select("nonce")
      .eq("session_id", key)
      .eq("kind", "order")
      .maybeSingle();
    return {
      ok: true as const,
      payload: existing ? makeOrderQR(key, existing.nonce) : null,
    };
  });
