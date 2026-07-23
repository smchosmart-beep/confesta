import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MAX_SCOOPS, MIN_SCOOPS_FOR_RECEIPT, makeReceiptToken, parseSessionQR } from "./shared";

const DeviceIdSchema = z.string().uuid();

export type AudienceOrderDTO = {
  id: string;
  sessionId: string;
  orderedAt: number;
  pickedUpAt: number | null;
  sessionTitle: string | null;
};

export type AudienceScoopDTO = {
  id: string;
  sessionId: string;
  flavor: string;
  stackedAt: number;
};

export type AudienceReceiptDTO = {
  token: string;
  issuedAt: number;
  redeemedAt: number | null;
  status: string;
} | null;

export type AudienceStateDTO = {
  orders: AudienceOrderDTO[];
  scoops: AudienceScoopDTO[];
  receipt: AudienceReceiptDTO;
  slotCategories: Record<string, string | null>;
};


export type AudienceMutationResult = {
  ok: boolean;
  message: string;
  state?: AudienceStateDTO;
};

async function loadState(deviceId: string): Promise<AudienceStateDTO> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [ordersRes, scoopsRes, receiptRes] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id, session_id, ordered_at, picked_up_at")
      .eq("device_id", deviceId)
      .order("ordered_at", { ascending: false }),
    supabaseAdmin
      .from("scoops")
      .select("id, session_id, flavor, stacked_at")
      .eq("device_id", deviceId)
      .order("stacked_at", { ascending: true }),
    supabaseAdmin
      .from("receipts")
      .select("token, issued_at, redeemed_at, status")
      .eq("device_id", deviceId)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (scoopsRes.error) throw scoopsRes.error;
  if (receiptRes.error) throw receiptRes.error;

  // Fetch slot titles + categories for orders / scoops that use slot-key sessionIds
  const { parseSlotKey } = await import("./shared");
  const titleMap = new Map<string, string>();
  const catMap: Record<string, string | null> = {};
  const sessionIds = new Set<string>();
  (ordersRes.data ?? []).forEach((o) => sessionIds.add(o.session_id));
  (scoopsRes.data ?? []).forEach((s) => sessionIds.add(s.session_id));
  const slotSessionIds = [...sessionIds].filter((id) => parseSlotKey(id));
  if (slotSessionIds.length > 0) {
    const { data: slotsRows } = await supabaseAdmin
      .from("session_slots")
      .select("day, period, room, title, category");
    const titleByKey = new Map<string, string>();
    const catByKey = new Map<string, string | null>();
    (slotsRows ?? []).forEach((r) => {
      const k = `${r.day}|${r.period}|${r.room}`;
      titleByKey.set(k, r.title ?? "");
      catByKey.set(k, (r.category ?? null) as string | null);
    });
    slotSessionIds.forEach((id) => {
      const t = titleByKey.get(id);
      if (t && t.trim().length > 0) titleMap.set(id, t);
      if (catByKey.has(id)) catMap[id] = catByKey.get(id) ?? null;
    });
  }


  return {
    orders: (ordersRes.data ?? []).map((o) => ({
      id: o.id,
      sessionId: o.session_id,
      orderedAt: new Date(o.ordered_at).getTime(),
      pickedUpAt: o.picked_up_at ? new Date(o.picked_up_at).getTime() : null,
      sessionTitle: titleMap.get(o.session_id) ?? null,
    })),
    scoops: (scoopsRes.data ?? []).map((s) => ({
      id: s.id,
      sessionId: s.session_id,
      flavor: s.flavor,
      stackedAt: new Date(s.stacked_at).getTime(),
    })),
    receipt: receiptRes.data
      ? {
          token: receiptRes.data.token,
          issuedAt: new Date(receiptRes.data.issued_at).getTime(),
          redeemedAt: receiptRes.data.redeemed_at
            ? new Date(receiptRes.data.redeemed_at).getTime()
            : null,
          status: receiptRes.data.status,
        }
      : null,
    slotCategories: catMap,
  };
}


const TOUCH_THROTTLE_MS = 60_000;
const lastTouched = new Map<string, number>();

async function touchDevice(deviceId: string) {
  const now = Date.now();
  const prev = lastTouched.get(deviceId) ?? 0;
  if (now - prev < TOUCH_THROTTLE_MS) return;
  lastTouched.set(deviceId, now);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("audience_devices")
    .upsert({ device_id: deviceId, last_seen: new Date().toISOString() }, { onConflict: "device_id" });
}

export const getAudienceState = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    await touchDevice(data.deviceId);
    return loadState(data.deviceId);
  });

export const placeOrderFromQR = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema, payload: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<AudienceMutationResult> => {
    const parsed = parseSessionQR(data.payload);
    if (!parsed) return { ok: false, message: "QR 형식이 올바르지 않아요" };
    if (parsed.kind !== "order")
      return { ok: false, message: "주문 QR이 아니에요" };

    await touchDevice(data.deviceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // verify nonce against session_nonces — block forged / rotated-out QRs
    const { data: nonceRow, error: nonceErr } = await supabaseAdmin
      .from("session_nonces")
      .select("nonce")
      .eq("session_id", parsed.sessionId)
      .eq("kind", "order")
      .maybeSingle();
    if (nonceErr) throw nonceErr;
    if (!nonceRow) return { ok: false, message: "발급되지 않은 QR이에요" };
    if (nonceRow.nonce !== parsed.nonce)
      return { ok: false, message: "만료된 QR이에요 (재발급됨)" };

    // limit 3 orders
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("device_id", data.deviceId);
    if ((count ?? 0) >= 3) {
      return { ok: false, message: "최대 3개까지 주문할 수 있어요" };
    }

    const { error } = await supabaseAdmin.from("orders").insert({
      device_id: data.deviceId,
      session_id: parsed.sessionId,
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: false, message: "이미 주문한 세션이에요" };
      }
      throw error;
    }
    return { ok: true, message: "주문이 접수됐어요 🍨", state: await loadState(data.deviceId) };
  });


export const pickupFromQR = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema, payload: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<AudienceMutationResult> => {
    const parsed = parseSessionQR(data.payload);
    if (!parsed) return { ok: false, message: "QR 형식이 올바르지 않아요" };
    if (parsed.kind !== "pickup")
      return { ok: false, message: "수령 QR이 아니에요" };

    await touchDevice(data.deviceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // verify pickup nonce
    const { data: nonceRow, error: nonceErr } = await supabaseAdmin
      .from("session_nonces")
      .select("nonce")
      .eq("session_id", parsed.sessionId)
      .eq("kind", "pickup")
      .maybeSingle();
    if (nonceErr) throw nonceErr;
    if (!nonceRow) return { ok: false, message: "발급되지 않은 수령 QR이에요" };
    if (nonceRow.nonce !== parsed.nonce)
      return { ok: false, message: "만료된 수령 QR이에요 (재발급됨)" };

    // must have ordered this session
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, picked_up_at")
      .eq("device_id", data.deviceId)
      .eq("session_id", parsed.sessionId)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) return { ok: false, message: "이 세션을 주문하지 않았어요" };
    if (order.picked_up_at) return { ok: false, message: "이미 수령 완료했어요" };

    // scoop cap
    const { count } = await supabaseAdmin
      .from("scoops")
      .select("id", { count: "exact", head: true })
      .eq("device_id", data.deviceId);
    if ((count ?? 0) >= MAX_SCOOPS) {
      return { ok: false, message: "콘이 이미 가득 찼어요 (최대 3스쿱)" };
    }

    // resolve flavor: prefer admin-configured slot category, then legacy mock, then hash fallback
    const { SESSIONS, getCategory, CATEGORIES } = await import("./mockData");
    const { parseSlotKey } = await import("./shared");
    let flavor: string | undefined;
    const slotParsed = parseSlotKey(parsed.sessionId);
    if (slotParsed) {
      const { data: slotRow } = await supabaseAdmin
        .from("session_slots")
        .select("category")
        .eq("day", slotParsed.day)
        .eq("period", slotParsed.period)
        .eq("room", slotParsed.room)
        .maybeSingle();
      const cat = slotRow?.category ?? null;
      if (cat) {
        flavor = getCategory(cat).flavor;
      }
    }
    if (!flavor) {
      const legacy = SESSIONS.find((s) => s.id === parsed.sessionId);
      if (legacy) {
        flavor = getCategory(legacy.category).flavor;
      } else if (slotParsed) {
        const hash = [...slotParsed.room].reduce((a, c) => a + c.charCodeAt(0), 0);
        flavor = CATEGORIES[hash % CATEGORIES.length].flavor;
      }
    }

    if (!flavor) return { ok: false, message: "세션을 찾을 수 없어요" };

    const nowIso = new Date().toISOString();
    const { error: scoopErr } = await supabaseAdmin.from("scoops").insert({
      device_id: data.deviceId,
      session_id: parsed.sessionId,
      flavor,
    });
    if (scoopErr && scoopErr.code !== "23505") throw scoopErr;

    await supabaseAdmin
      .from("orders")
      .update({ picked_up_at: nowIso })
      .eq("id", order.id);

    // bump attendance? (kept lightweight; admin step calculates)
    return { ok: true, message: "수령 완료! 스쿱이 쌓였어요 🍦", state: await loadState(data.deviceId) };
  });

export const generateReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<AudienceMutationResult> => {
    await touchDevice(data.deviceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("receipts")
      .select("token, status")
      .eq("device_id", data.deviceId)
      .order("issued_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return { ok: true, message: "이미 발급된 영수증이 있어요", state: await loadState(data.deviceId) };
    }

    const { data: scoops } = await supabaseAdmin
      .from("scoops")
      .select("id, session_id")
      .eq("device_id", data.deviceId)
      .order("stacked_at", { ascending: true });
    if (!scoops || scoops.length < MIN_SCOOPS_FOR_RECEIPT) {
      return { ok: false, message: `스쿱 ${MIN_SCOOPS_FOR_RECEIPT}개 이상 모아주세요` };
    }

    const token = makeReceiptToken(scoops.map((s) => ({ sessionId: s.session_id })));
    const { error } = await supabaseAdmin.from("receipts").insert({
      token,
      device_id: data.deviceId,
      scoop_ids: scoops.map((s) => s.id),
    });
    if (error) throw error;
    return { ok: true, message: "영수증이 발급됐어요 🎟️", state: await loadState(data.deviceId) };
  });

export const resetMyCone = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<AudienceMutationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all([
      supabaseAdmin.from("scoops").delete().eq("device_id", data.deviceId),
      supabaseAdmin.from("receipts").delete().eq("device_id", data.deviceId),
      supabaseAdmin
        .from("orders")
        .update({ picked_up_at: null })
        .eq("device_id", data.deviceId),
    ]);
    return { ok: true, message: "콘을 초기화했어요", state: await loadState(data.deviceId) };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ deviceId: DeviceIdSchema, orderId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<AudienceMutationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: deleted, error } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", data.orderId)
      .eq("device_id", data.deviceId)
      .is("picked_up_at", null)
      .select("id");
    if (error) throw error;
    if (!deleted || deleted.length === 0) {
      return {
        ok: false,
        message: "삭제할 수 없는 주문이에요 (이미 수령 완료)",
        state: await loadState(data.deviceId),
      };
    }
    return { ok: true, message: "주문을 삭제했어요", state: await loadState(data.deviceId) };
  });
