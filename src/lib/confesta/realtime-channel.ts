import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TableSpec = {
  table: "toppings" | "topping_likes" | "answer_prompts" | "topping_gates";
};

type Kind = "toppings" | "prompts" | "gate";

interface Entry {
  channel: RealtimeChannel | null;
  refCount: number;
  listeners: Set<() => void>;
  healthListeners: Set<() => void>;
  healthy: boolean;
  attempt: number;
  backoffTimer: ReturnType<typeof setTimeout> | null;
  initialTimer: ReturnType<typeof setTimeout> | null;
}

const KIND_TABLES: Record<Kind, TableSpec[]> = {
  // topping_likes는 publication에서 제외됨. 좋아요 카운트는 toppings.likes UPDATE로 전파됨.
  toppings: [{ table: "toppings" }],
  prompts: [{ table: "answer_prompts" }],
  gate: [{ table: "topping_gates" }],
};

// 폭주하는 invalidation을 합치는 trailing debounce (서버 read 부하 감소)
const NOTIFY_DEBOUNCE_MS = 200;
const notifyTimers = new WeakMap<Set<() => void>, ReturnType<typeof setTimeout>>();
function scheduleNotify(set: Set<() => void>) {
  const existing = notifyTimers.get(set);
  if (existing) return;
  const t = setTimeout(() => {
    notifyTimers.delete(set);
    notifyAll(set);
  }, NOTIFY_DEBOUNCE_MS);
  notifyTimers.set(set, t);
}

const registries: Record<Kind, Map<string, Entry>> = {
  toppings: new Map(),
  prompts: new Map(),
  gate: new Map(),
};

const INITIAL_TIMEOUT_MS = 8000;
const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

function jitter(ms: number, ratio = 0.2): number {
  const delta = ms * ratio;
  return ms + (Math.random() * 2 - 1) * delta;
}

function notifyAll(set: Set<() => void>) {
  for (const fn of set) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function setHealthy(entry: Entry, healthy: boolean) {
  if (entry.healthy === healthy) return;
  entry.healthy = healthy;
  notifyAll(entry.healthListeners);
}

function clearTimers(entry: Entry) {
  if (entry.initialTimer) {
    clearTimeout(entry.initialTimer);
    entry.initialTimer = null;
  }
  if (entry.backoffTimer) {
    clearTimeout(entry.backoffTimer);
    entry.backoffTimer = null;
  }
}

function teardownChannel(entry: Entry) {
  clearTimers(entry);
  if (entry.channel) {
    void supabase.removeChannel(entry.channel);
    entry.channel = null;
  }
}

function buildChannel(kind: Kind, sessionId: string, entry: Entry) {
  const tables = KIND_TABLES[kind];
  const channelName = `${kind}:${sessionId}:singleton`;
  const ch = supabase.channel(channelName);

  for (const { table } of tables) {
    ch.on(
      "postgres_changes" as never,
      {
        event: "*",
        schema: "public",
        table,
        filter: `session_id=eq.${sessionId}`,
      } as never,
      () => scheduleNotify(entry.listeners),
    );
  }

  entry.channel = ch;
  entry.initialTimer = setTimeout(() => {
    if (!entry.healthy) {
      setHealthy(entry, false);
      scheduleReconnect(kind, sessionId);
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
      scheduleReconnect(kind, sessionId);
    }
  });
}

function scheduleReconnect(kind: Kind, sessionId: string) {
  const entry = registries[kind].get(sessionId);
  if (!entry || entry.refCount <= 0) return;
  if (entry.backoffTimer) return; // already scheduled

  const stepIdx = Math.min(entry.attempt, BACKOFF_STEPS_MS.length - 1);
  const base =
    entry.attempt === 0 ? Math.random() * 2000 : BACKOFF_STEPS_MS[stepIdx];
  const delay = entry.attempt === 0 ? base : jitter(base);
  entry.attempt += 1;

  entry.backoffTimer = setTimeout(() => {
    entry.backoffTimer = null;
    const live = registries[kind].get(sessionId);
    if (!live || live.refCount <= 0) return;
    if (live.channel) {
      void supabase.removeChannel(live.channel);
      live.channel = null;
    }
    if (live.initialTimer) {
      clearTimeout(live.initialTimer);
      live.initialTimer = null;
    }
    buildChannel(kind, sessionId, live);
  }, delay);
}

function ensureEntry(kind: Kind, sessionId: string): Entry {
  let entry = registries[kind].get(sessionId);
  if (!entry) {
    entry = {
      channel: null,
      refCount: 0,
      listeners: new Set(),
      healthListeners: new Set(),
      healthy: false,
      attempt: 0,
      backoffTimer: null,
      initialTimer: null,
    };
    registries[kind].set(sessionId, entry);
    buildChannel(kind, sessionId, entry);
  }
  return entry;
}

function subscribe(
  kind: Kind,
  sessionId: string,
  onChange: () => void,
): () => void {
  const entry = ensureEntry(kind, sessionId);
  entry.refCount += 1;
  entry.listeners.add(onChange);

  return () => {
    entry.listeners.delete(onChange);
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      teardownChannel(entry);
      registries[kind].delete(sessionId);
    }
  };
}

function subscribeHealth(
  kind: Kind,
  sessionId: string,
  cb: () => void,
): () => void {
  const entry = ensureEntry(kind, sessionId);
  entry.healthListeners.add(cb);
  return () => {
    entry.healthListeners.delete(cb);
    // Note: do not teardown on health-only unsubscribe; data listeners control lifetime.
  };
}

function getHealthy(kind: Kind, sessionId: string): boolean {
  return registries[kind].get(sessionId)?.healthy ?? false;
}

export const subscribeToppings = (sessionId: string, cb: () => void) =>
  subscribe("toppings", sessionId, cb);
export const subscribePrompts = (sessionId: string, cb: () => void) =>
  subscribe("prompts", sessionId, cb);
export const subscribeGate = (sessionId: string, cb: () => void) =>
  subscribe("gate", sessionId, cb);

export function useRealtimeHealth(
  kind: Kind,
  sessionId: string | null,
): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (!sessionId) return () => {};
      return subscribeHealth(kind, sessionId, cb);
    },
    () => (sessionId ? getHealthy(kind, sessionId) : true),
    () => true, // SSR: assume healthy → no polling
  );
}

// ── Global (publication-wide) subscriptions ──────────────────────────────
// Used for tables where we don't filter by session_id (orders aggregates,
// session_slots edits, my-toppings by device_id). Each subscriber gets a
// dedicated channel — these are admin/presenter-only and low-volume, so we
// skip the ref-counted registry to keep the code simple.

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
// subscribeMyToppings 제거: 청중당 글로벌 채널 비용을 없애기 위해 mutation onSuccess
// invalidate (use-toppings.ts의 addTopping/deleteOwnMut)로 대체함.
