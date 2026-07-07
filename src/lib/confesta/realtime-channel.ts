import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

type Kind = "toppings" | "prompts" | "gate" | "comments";

const KINDS: Kind[] = ["toppings", "prompts", "gate", "comments"];

const KIND_TABLE: Record<Kind, string> = {
  // topping_likes는 publication에서 제외됨. 좋아요 카운트는 toppings.likes UPDATE로 전파됨.
  toppings: "toppings",
  prompts: "answer_prompts",
  gate: "topping_gates",
  comments: "topping_comments",
};

export type RealtimeRow = Record<string, unknown>;
export type RealtimePayload = RealtimePostgresChangesPayload<RealtimeRow>;
type Cb = (payload: RealtimePayload) => void;

interface SessionEntry {
  channel: RealtimeChannel | null;
  refCount: number; // 4개 kind 리스너 총합
  listenersByKind: Record<Kind, Set<Cb>>;
  healthListeners: Set<() => void>;
  healthy: boolean;
  attempt: number;
  backoffTimer: ReturnType<typeof setTimeout> | null;
  initialTimer: ReturnType<typeof setTimeout> | null;
}

// 세션당 채널 1개. kind별 리스너 Set은 분리.
// A안: invalidate→refetch 대신 payload 직접 캐시 패치. 디바운스 제거 —
//  setQueryData는 in-memory + React 18 auto-batching으로 저렴.
const sessionRegistry = new Map<string, SessionEntry>();

const INITIAL_TIMEOUT_MS = 8000;
const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

function jitter(ms: number, ratio = 0.2): number {
  const delta = ms * ratio;
  return ms + (Math.random() * 2 - 1) * delta;
}

function notifyHealth(set: Set<() => void>) {
  for (const fn of set) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function setHealthy(entry: SessionEntry, healthy: boolean) {
  if (entry.healthy === healthy) return;
  entry.healthy = healthy;
  notifyHealth(entry.healthListeners);
}

function clearTimers(entry: SessionEntry) {
  if (entry.initialTimer) {
    clearTimeout(entry.initialTimer);
    entry.initialTimer = null;
  }
  if (entry.backoffTimer) {
    clearTimeout(entry.backoffTimer);
    entry.backoffTimer = null;
  }
}

function teardownChannel(entry: SessionEntry) {
  clearTimers(entry);
  if (entry.channel) {
    void supabase.removeChannel(entry.channel);
    entry.channel = null;
  }
}

function buildChannel(sessionId: string, entry: SessionEntry) {
  const channelName = `session:${sessionId}:singleton`;
  const ch = supabase.channel(channelName);

  for (const kind of KINDS) {
    ch.on(
      "postgres_changes" as never,
      {
        event: "*",
        schema: "public",
        table: KIND_TABLE[kind],
        filter: `session_id=eq.${sessionId}`,
      } as never,
      (payload: RealtimePayload) => {
        const set = entry.listenersByKind[kind];
        for (const fn of set) {
          try {
            fn(payload);
          } catch {
            /* ignore */
          }
        }
      },
    );
  }

  entry.channel = ch;
  entry.initialTimer = setTimeout(() => {
    if (!entry.healthy) {
      setHealthy(entry, false);
      scheduleReconnect(sessionId);
    }
  }, INITIAL_TIMEOUT_MS);

  ch.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      entry.attempt = 0;
      clearTimers(entry);
      setHealthy(entry, true);
    } else if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT" ||
      status === "CLOSED"
    ) {
      setHealthy(entry, false);
      scheduleReconnect(sessionId);
    }
  });
}

function scheduleReconnect(sessionId: string) {
  const entry = sessionRegistry.get(sessionId);
  if (!entry || entry.refCount <= 0) return;
  if (entry.backoffTimer) return;

  const stepIdx = Math.min(entry.attempt, BACKOFF_STEPS_MS.length - 1);
  const base =
    entry.attempt === 0 ? Math.random() * 2000 : BACKOFF_STEPS_MS[stepIdx];
  const delay = entry.attempt === 0 ? base : jitter(base);
  entry.attempt += 1;

  entry.backoffTimer = setTimeout(() => {
    entry.backoffTimer = null;
    const live = sessionRegistry.get(sessionId);
    if (!live || live.refCount <= 0) return;
    if (live.channel) {
      void supabase.removeChannel(live.channel);
      live.channel = null;
    }
    if (live.initialTimer) {
      clearTimeout(live.initialTimer);
      live.initialTimer = null;
    }
    buildChannel(sessionId, live);
  }, delay);
}

function ensureEntry(sessionId: string): SessionEntry {
  let entry = sessionRegistry.get(sessionId);
  if (!entry) {
    entry = {
      channel: null,
      refCount: 0,
      listenersByKind: {
        toppings: new Set(),
        prompts: new Set(),
        gate: new Set(),
        comments: new Set(),
      },
      healthListeners: new Set(),
      healthy: false,
      attempt: 0,
      backoffTimer: null,
      initialTimer: null,
    };
    sessionRegistry.set(sessionId, entry);
    buildChannel(sessionId, entry);
  }
  return entry;
}

function subscribe(
  kind: Kind,
  sessionId: string,
  onChange: Cb,
): () => void {
  const entry = ensureEntry(sessionId);
  entry.refCount += 1;
  entry.listenersByKind[kind].add(onChange);

  return () => {
    entry.listenersByKind[kind].delete(onChange);
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      teardownChannel(entry);
      sessionRegistry.delete(sessionId);
    }
  };
}

function subscribeHealth(
  sessionId: string,
  cb: () => void,
): () => void {
  const entry = ensureEntry(sessionId);
  entry.healthListeners.add(cb);
  return () => {
    entry.healthListeners.delete(cb);
    // Note: do not teardown on health-only unsubscribe; data listeners control lifetime.
  };
}

function getHealthy(sessionId: string): boolean {
  return sessionRegistry.get(sessionId)?.healthy ?? false;
}

export const subscribeToppings = (sessionId: string, cb: Cb) =>
  subscribe("toppings", sessionId, cb);
export const subscribePrompts = (sessionId: string, cb: Cb) =>
  subscribe("prompts", sessionId, cb);
export const subscribeGate = (sessionId: string, cb: Cb) =>
  subscribe("gate", sessionId, cb);
export const subscribeToppingComments = (sessionId: string, cb: Cb) =>
  subscribe("comments", sessionId, cb);

export function useRealtimeHealth(
  _kind: Kind,
  sessionId: string | null,
): boolean {
  // kind는 시그니처 호환용. 세션당 채널 1개이므로 세션 단위 health를 반환.
  return useSyncExternalStore(
    (cb) => {
      if (!sessionId) return () => {};
      return subscribeHealth(sessionId, cb);
    },
    () => (sessionId ? getHealthy(sessionId) : true),
    () => true, // SSR: assume healthy → no polling
  );
}

// ── Global (publication-wide) subscriptions ──────────────────────────────
// Used for tables where we don't filter by session_id (orders aggregates,
// session_slots edits). Each subscriber gets a dedicated channel — these are
// admin/presenter-only and low-volume, so we skip the ref-counted registry.

type GlobalTable = "orders" | "session_slots";

function subscribeGlobalTable(
  table: GlobalTable,
  cb: () => void,
  filter?: string,
): () => void {
  const channelName = `${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2, 8)}`;
  const ch = supabase.channel(channelName);
  ch.on(
    "postgres_changes" as never,
    {
      event: "*",
      schema: "public",
      table,
      ...(filter ? { filter } : {}),
    } as never,
    () => cb(),
  );
  ch.subscribe();
  return () => {
    void supabase.removeChannel(ch);
  };
}

export const subscribeOrders = (cb: () => void) =>
  subscribeGlobalTable("orders", cb);
export const subscribeSlots = (cb: () => void) =>
  subscribeGlobalTable("session_slots", cb);
