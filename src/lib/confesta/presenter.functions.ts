// Per-session presenter password serverFns.
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { makeSlotKey, type Period } from "./shared";

const PeriodSchema = z.enum(["1000", "1320", "1530"]);
const DaySchema = z.number().int().min(1).max(10);
const RoomSchema = z.string().min(1).max(64);
const SlotKeySchema = z.object({
  day: DaySchema,
  period: PeriodSchema,
  room: RoomSchema,
});
const PasswordSchema = z
  .string()
  .min(6, "최소 6자 이상")
  .max(64, "최대 64자")
  .regex(/^\S+$/, "공백은 사용할 수 없어요");

async function requireAdmin() {
  const { assertRole } = await import("./assertRole");
  await assertRole("admin");
}

async function loadHash(sessionId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("session_secrets")
    .select("password_hash")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return (data as { password_hash: string } | null)?.password_hash ?? null;
}

const slotCookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: "/",
  partitioned: true,
};

/** Admin: set or change the presenter password for a session. Empty string clears it. */
export const setSlotPresenterPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    SlotKeySchema.extend({
      password: z.string().max(64),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sessionId = makeSlotKey(data.day, data.period as Period, data.room);

    if (data.password.trim() === "") {
      const { error } = await supabaseAdmin
        .from("session_secrets")
        .delete()
        .eq("session_id", sessionId);
      if (error) throw error;
      return { ok: true as const, cleared: true as const };
    }

    const parsed = PasswordSchema.safeParse(data.password);
    if (!parsed.success) {
      return {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "유효하지 않은 비밀번호",
      };
    }

    const { hashPassword } = await import("./presenterSlot.server");
    const password_hash = hashPassword(parsed.data);
    const { error } = await supabaseAdmin
      .from("session_secrets")
      .upsert(
        {
          session_id: sessionId,
          password_hash,
          password_plain: parsed.data,
          set_at: new Date().toISOString(),
        } as never,
        { onConflict: "session_id" },
      );
    if (error) throw error;
    return { ok: true as const, cleared: false as const };
  });

/** Admin: reveal the current plaintext password (if stored). */
export const revealSlotPresenterPassword = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SlotKeySchema.parse(input))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sessionId = makeSlotKey(data.day, data.period as Period, data.room);
    const { data: row, error } = await supabaseAdmin
      .from("session_secrets")
      .select("password_plain, password_hash")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: true as const, password: null, legacy: false };
    const rec = row as { password_plain: string | null; password_hash: string | null };
    if (rec.password_plain) return { ok: true as const, password: rec.password_plain, legacy: false };
    return { ok: true as const, password: null, legacy: !!rec.password_hash };
  });

/** Presenter: unlock a session by submitting its password; issues a 12h cookie. */
export const unlockPresenterSlot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    SlotKeySchema.extend({ password: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const sessionId = makeSlotKey(data.day, data.period as Period, data.room);
    const stored = await loadHash(sessionId);
    if (!stored) {
      return { ok: false as const, reason: "unset" as const };
    }
    const {
      passwordsMatch,
      makeSlotCookieValue,
      slotCookieName,
      SLOT_COOKIE_MAX_AGE,
      shortHash,
    } = await import("./presenterSlot.server");
    if (!passwordsMatch(stored, data.password)) {
      return { ok: false as const, reason: "mismatch" as const };
    }
    const cookieName = slotCookieName(sessionId);
    setCookie(cookieName, makeSlotCookieValue(sessionId), {
      ...slotCookieOpts,
      maxAge: SLOT_COOKIE_MAX_AGE,
    } as Parameters<typeof setCookie>[2]);
    console.log(
      `[presenter-slot] unlock sid=${shortHash(sessionId)} ck=${shortHash(cookieName)} issuedAt=${Date.now()}`,
    );
    return { ok: true as const };
  });

/** Presenter: is the current device already unlocked for this slot? */
export const checkPresenterSlot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SlotKeySchema.parse(input))
  .handler(async ({ data }) => {
    const sessionId = makeSlotKey(data.day, data.period as Period, data.room);
    const { slotCookieName, inspectSlotCookieValue, shortHash } = await import(
      "./presenterSlot.server"
    );
    const cookieName = slotCookieName(sessionId);
    const v = getCookie(cookieName);
    const insp = inspectSlotCookieValue(sessionId, v);
    console.log(
      `[presenter-slot] check sid=${shortHash(sessionId)} ck=${shortHash(cookieName)} hasCookie=${!!v} ${
        insp.ok
          ? `ok ageMs=${insp.ageMs}`
          : `fail reason=${insp.reason}${insp.ageMs !== undefined ? ` ageMs=${insp.ageMs}` : ""}`
      }`,
    );
    return { ok: insp.ok };
  });

/** Presenter: clear the unlock cookie for this slot. */
export const clearPresenterSlot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SlotKeySchema.parse(input))
  .handler(async ({ data }) => {
    const sessionId = makeSlotKey(data.day, data.period as Period, data.room);
    const { slotCookieName } = await import("./presenterSlot.server");
    deleteCookie(
      slotCookieName(sessionId),
      slotCookieOpts as Parameters<typeof deleteCookie>[1],
    );
    return { ok: true as const };
  });

