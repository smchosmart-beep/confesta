import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseReceiptToken } from "./shared";

const TokenSchema = z.string().min(8).max(400);

export type RedemptionResult = {
  status: "success" | "duplicate" | "invalid";
  token: string;
  redeemedAt: number;
};

export const redeemReceipt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: TokenSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<RedemptionResult> => {
    const { assertRole } = await import("./assertRole");
    await assertRole("staff");

    const now = Date.now();
    if (!parseReceiptToken(data.token)) {
      return { status: "invalid", token: data.token, redeemedAt: now };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin
      .from("receipts")
      .select("token, status, redeemed_at")
      .eq("token", data.token)
      .maybeSingle();

    if (!r) return { status: "invalid", token: data.token, redeemedAt: now };
    if (r.status === "redeemed") {
      return {
        status: "duplicate",
        token: data.token,
        redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).getTime() : now,
      };
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("receipts")
      .update({ status: "redeemed", redeemed_at: nowIso })
      .eq("token", data.token);
    if (error) throw error;
    return { status: "success", token: data.token, redeemedAt: now };
  });

export type RedemptionLogDTO = {
  token: string;
  redeemedAt: number;
  status: "success" | "duplicate" | "invalid";
};

export const listRecentRedemptions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(100).default(20) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { assertRole } = await import("./assertRole");
    await assertRole("staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("receipts")
      .select("token, redeemed_at, status")
      .eq("status", "redeemed")
      .order("redeemed_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return {
      log: (rows ?? []).map((r) => ({
        token: r.token,
        redeemedAt: r.redeemed_at ? new Date(r.redeemed_at).getTime() : 0,
        status: "success" as const,
      })),
    };
  });
