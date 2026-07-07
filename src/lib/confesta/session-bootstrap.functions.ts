import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AudienceRole } from "./audienceRole";
import type { ToppingDTO } from "./toppings.functions";
import type { AnswerPromptDTO } from "./prompts.functions";
import type { ToppingGateDTO } from "./gates.functions";


const SessionIdSchema = z.string().min(1).max(120);
const DeviceIdSchema = z.string().uuid();

const GATE_DEFAULT: Omit<ToppingGateDTO, "sessionId"> = {
  questionsOpen: true,
  answersOpen: false,
  activePromptId: null,
};

export type SessionBootstrapResult = {
  toppings?: { toppings: ToppingDTO[] };
  prompts?: { prompts: AnswerPromptDTO[] };
  gate?: ToppingGateDTO;
  commentCounts?: Record<string, number>;
  errors: {
    toppings?: string;
    prompts?: string;
    gate?: string;
    commentCounts?: string;
  };
};

// ─────────────────────────────────────────────────────────────
// 공용 층 in-memory 캐시 (sessionId 키, TTL 5s, Promise single-flight)
// - 2000명 동시 진입 시 워커 인스턴스당 DB 조회 1회로 축소
// - Promise를 저장하여 stampede 방지
// - reject 시 즉시 캐시에서 삭제하여 에러 캐싱 금지
// - 개인화 필드(likedByMe, mine)는 요청별로 재계산 → 유출 없음
// ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5_000;

type CacheEntry<T> = { promise: Promise<T>; expiresAt: number };
type BootstrapCaches = {
  toppingsRaw: Map<string, CacheEntry<ToppingRawRow[]>>;
  prompts: Map<string, CacheEntry<{ prompts: AnswerPromptDTO[] }>>;
  gate: Map<string, CacheEntry<ToppingGateDTO>>;
  commentCounts: Map<string, CacheEntry<Record<string, number>>>;
};

const CACHE_SYMBOL = Symbol.for("__confesta_bootstrap_cache__");
type CacheGlobal = typeof globalThis & { [CACHE_SYMBOL]?: BootstrapCaches };

function getCaches(): BootstrapCaches {
  const g = globalThis as CacheGlobal;
  if (!g[CACHE_SYMBOL]) {
    g[CACHE_SYMBOL] = {
      toppingsRaw: new Map(),
      prompts: new Map(),
      gate: new Map(),
      commentCounts: new Map(),
    };
  }
  return g[CACHE_SYMBOL]!;
}

function memoize<T>(
  bucket: Map<string, CacheEntry<T>>,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = bucket.get(key);
  if (hit && hit.expiresAt > now) return hit.promise;
  const promise = loader().catch((err) => {
    // 실패 캐싱 방지: 현재 항목이 이 promise인 경우에만 삭제
    const cur = bucket.get(key);
    if (cur && cur.promise === promise) bucket.delete(key);
    throw err;
  });
  bucket.set(key, { promise, expiresAt: now + CACHE_TTL_MS });
  return promise;
}

type ToppingRawRow = {
  id: string;
  session_id: string;
  text: string;
  kind: string;
  prompt_id: string | null;
  prompt_text: string | null;
  pinned: boolean;
  addressed: boolean;
  likes: number;
  created_at: string;
  device_id: string | null;
  role: AudienceRole | null;
  op_id: string | null;
};

/**
 * 세션 페이지 진입 시 4개 조회(toppings/prompts/gate/comments)를 단일 요청으로 병렬 실행.
 * 각 필드는 try/catch로 격리되어 하나가 실패해도 나머지는 반환되며,
 * 클라이언트는 실패한 키만 기존 훅의 자체 fetch로 폴백함.
 *
 * 공용 층(toppings raw / prompts / gate / commentCounts)은 sessionId 키로
 * TTL 5s in-memory 캐시. 개인화 필드(likedByMe, mine)는 요청별로 재계산.
 */
export const bootstrapSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sessionId: SessionIdSchema,
        deviceId: DeviceIdSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<SessionBootstrapResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sessionId, deviceId } = data;
    const caches = getCaches();

    // ── 공용 층: raw toppings (device_id 무관, 100건 캡 유지) ──
    const loadToppingsRaw = (): Promise<ToppingRawRow[]> =>
      memoize(caches.toppingsRaw, sessionId, async () => {
        const { data: rows, error } = await supabaseAdmin.rpc(
          "list_toppings_with_my_like_v2",
          // _device_id 생략 → RPC 기본값 NULL → liked_by_me는 항상 false,
          // 반환 subset은 deviceId 무관.
          { _session_id: sessionId, _limit: 100 },
        );
        if (error) throw error;
        return (rows ?? []) as ToppingRawRow[];
      });

    // ── 개인 층: 이 사용자의 likes 집합 (캐시 없음) ──
    const loadLikedSet = async (): Promise<Set<string>> => {
      const { data: rows, error } = await supabaseAdmin
        .from("topping_likes")
        .select("topping_id")
        .eq("session_id", sessionId)
        .eq("device_id", deviceId);
      if (error) throw error;
      const set = new Set<string>();
      for (const r of (rows ?? []) as Array<{ topping_id: string }>) {
        set.add(r.topping_id);
      }
      return set;
    };

    const loadToppings = async (): Promise<{ toppings: ToppingDTO[] }> => {
      const [rawRows, likedSet] = await Promise.all([
        loadToppingsRaw(),
        loadLikedSet(),
      ]);
      return {
        toppings: rawRows.map((r) => ({
          id: r.id,
          sessionId: r.session_id,
          text: r.text,
          kind: (r.kind === "answer" ? "answer" : "question") as "question" | "answer",
          promptId: r.prompt_id,
          promptText: r.prompt_text,
          pinned: !!r.pinned,
          addressed: !!r.addressed,
          likes: r.likes ?? 0,
          likedByMe: likedSet.has(r.id),
          mine: r.device_id === deviceId,
          role: (r.role ?? "other") as AudienceRole,
          createdAt: new Date(r.created_at).getTime(),
        })),
      };
    };

    const loadPrompts = (): Promise<{ prompts: AnswerPromptDTO[] }> =>
      memoize(caches.prompts, sessionId, async () => {
        const { data: rows, error } = await supabaseAdmin
          .from("answer_prompts")
          .select("id, session_id, text, created_at, closed_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return {
          prompts: (rows ?? []).map((r) => ({
            id: r.id,
            sessionId: r.session_id,
            text: r.text,
            createdAt: new Date(r.created_at).getTime(),
            closedAt: r.closed_at ? new Date(r.closed_at).getTime() : null,
          })),
        };
      });

    const loadGate = (): Promise<ToppingGateDTO> =>
      memoize(caches.gate, sessionId, async () => {
        const { data: r, error } = await supabaseAdmin
          .from("topping_gates")
          .select("session_id, questions_open, answers_open, active_prompt_id")
          .eq("session_id", sessionId)
          .maybeSingle();
        if (error) throw error;
        if (!r) return { sessionId, ...GATE_DEFAULT };
        return {
          sessionId: r.session_id,
          questionsOpen: !!r.questions_open,
          answersOpen: !!r.answers_open,
          activePromptId: r.active_prompt_id,
        };
      });

    const loadCommentCounts = (): Promise<Record<string, number>> =>
      memoize(caches.commentCounts, sessionId, async () => {
        const { data: rows, error } = await supabaseAdmin.rpc(
          "count_comments_by_session",
          { _session_id: sessionId },
        );
        if (error) throw error;
        const counts: Record<string, number> = {};
        for (const r of (rows ?? []) as Array<{ topping_id: string; cnt: number }>) {
          counts[r.topping_id] = r.cnt;
        }
        return counts;
      });

    const [t, p, g, c] = await Promise.allSettled([
      loadToppings(),
      loadPrompts(),
      loadGate(),
      loadCommentCounts(),
    ]);

    const result: SessionBootstrapResult = { errors: {} };
    if (t.status === "fulfilled") result.toppings = t.value;
    else result.errors.toppings = String(t.reason?.message ?? t.reason ?? "error");
    if (p.status === "fulfilled") result.prompts = p.value;
    else result.errors.prompts = String(p.reason?.message ?? p.reason ?? "error");
    if (g.status === "fulfilled") result.gate = g.value;
    else result.errors.gate = String(g.reason?.message ?? g.reason ?? "error");
    if (c.status === "fulfilled") result.commentCounts = c.value;
    else result.errors.commentCounts = String(c.reason?.message ?? c.reason ?? "error");
    return result;
  });
