import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  listToppings,
  listToppingsForPresenter,
  addTopping as addToppingFn,
  toggleLikeTopping as toggleLikeFn,
  togglePinTopping as togglePinFn,
  toggleAddressedTopping as toggleAddressedFn,
  deleteOwnTopping as deleteOwnFn,
  type ToppingDTO,
} from "@/lib/confesta/toppings.functions";
import type { AnswerPromptDTO } from "@/lib/confesta/prompts.functions";
import type { AudienceRole } from "@/lib/confesta/audienceRole";
import { useDeviceId } from "./use-device-id";
import { useAudienceRole } from "./use-audience-role";
import {
  subscribeToppings,
  useRealtimeHealth,
  type RealtimePayload,
} from "@/lib/confesta/realtime-channel";

type ToppingRow = {
  id: string;
  session_id: string;
  text: string;
  kind: string;
  prompt_id: string | null;
  pinned: boolean;
  addressed: boolean;
  likes: number;
  created_at: string;
  device_id: string | null;
  role: AudienceRole | null;
};

function rowToDTO(
  r: ToppingRow,
  deviceId: string | null,
  promptText: string | null,
  prev?: ToppingDTO,
): ToppingDTO {
  return {
    id: r.id,
    sessionId: r.session_id,
    text: r.text,
    kind: r.kind === "answer" ? "answer" : "question",
    promptId: r.prompt_id,
    promptText,
    pinned: !!r.pinned,
    addressed: !!r.addressed,
    likes: r.likes ?? 0,
    likedByMe: prev?.likedByMe ?? false,
    mine: !!deviceId && r.device_id === deviceId,
    role: (r.role ?? "other") as AudienceRole,
    createdAt: new Date(r.created_at).getTime(),
  };
}

// 청중용 소프트 캡 (질문 전용). 발표자 모드에서는 트림 비활성.
function trimList(items: ToppingDTO[], cap = 200): ToppingDTO[] {
  if (items.length <= cap) return items;
  const priorityIds = new Set<string>();
  const nonPri: string[] = [];
  for (const t of items) {
    if (t.kind === "answer" || t.pinned || t.addressed) priorityIds.add(t.id);
    else nonPri.push(t.id);
  }
  const keepNonPri = new Set(nonPri.slice(0, Math.max(0, cap - priorityIds.size)));
  return items.filter((t) => priorityIds.has(t.id) || keepNonPri.has(t.id));
}

// 모듈 수준 좋아요 보호 구간 — 두 훅(audience/presenter) 공유.
const LIKE_GUARD_TTL_MS = 2000;
const likeGuards = new Map<
  string,
  { liked: boolean; likes: number; expires: number }
>();
const guardKey = (s: string, d: string, t: string) => `${s}:${d}:${t}`;
export function applyLikeGuards<T extends { id: string; likedByMe: boolean; likes: number }>(
  sessionId: string,
  deviceId: string | null,
  items: T[],
): T[] {
  if (!deviceId) return items;
  const now = Date.now();
  let changed = false;
  const next = items.map((t) => {
    const g = likeGuards.get(guardKey(sessionId, deviceId, t.id));
    if (!g) return t;
    if (g.expires < now) {
      likeGuards.delete(guardKey(sessionId, deviceId, t.id));
      return t;
    }
    if (t.likedByMe === g.liked && t.likes === g.likes) return t;
    changed = true;
    return { ...t, likedByMe: g.liked, likes: g.likes };
  });
  return changed ? next : items;
}
const inflightLikes = new Set<string>();
const LIKE_COOLDOWN_MS = 500;
const lastLikeAt = new Map<string, number>();

type Mode = "audience" | "presenter";

interface ToppingsHookOpts {
  mode: Mode;
}

function useToppingsCore(sessionId: string | null, opts: ToppingsHookOpts) {
  const { mode } = opts;
  const keyPrefix = mode === "presenter" ? "toppings-presenter" : "toppings";
  // 발표자 모드는 질문+응답 전량, 청중은 질문 전용 + 응답 realtime 스킵
  const skipAnswerRealtime = mode === "audience";
  const softCap = mode === "presenter" ? 5000 : 200;

  const deviceId = useDeviceId();
  const { state: roleState } = useAudienceRole();
  const qc = useQueryClient();
  const [pendingLikeIds, setPendingLikeIds] = useState<Set<string>>(() => new Set());
  const listAudienceFn = useServerFn(listToppings);
  const listPresenterFn = useServerFn(listToppingsForPresenter);
  const listFn = mode === "presenter" ? listPresenterFn : listAudienceFn;
  const addFn = useServerFn(addToppingFn);
  const likeFn = useServerFn(toggleLikeFn);
  const pinFn = useServerFn(togglePinFn);
  const addrFn = useServerFn(toggleAddressedFn);
  const deleteFn = useServerFn(deleteOwnFn);

  const queryKey = [keyPrefix, sessionId, deviceId] as const;
  const healthy = useRealtimeHealth("toppings", sessionId);

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const r = await listFn({
        data: { sessionId: sessionId!, deviceId: deviceId ?? undefined },
      });
      return {
        ...r,
        toppings: applyLikeGuards(sessionId!, deviceId, r.toppings),
      };
    },
    enabled: !!sessionId,
    staleTime: 15_000,
    refetchOnWindowFocus: !healthy,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: healthy ? false : 60_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToppings(sessionId, (payload: RealtimePayload) => {
      try {
        const type = payload.eventType;
        const matches = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
          queryKey: [keyPrefix, sessionId],
        });

        if (type === "DELETE") {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (!oldId) return;
          for (const [key, prev] of matches) {
            if (!prev) continue;
            const next = prev.toppings.filter((t) => t.id !== oldId);
            if (next.length !== prev.toppings.length) {
              qc.setQueryData(key, { ...prev, toppings: next });
            }
          }
          return;
        }

        const row = payload.new as ToppingRow | null;
        if (!row?.id) return;
        // 청중 캐시는 질문 전용 — 응답 이벤트는 무시(오염 방지)
        if (skipAnswerRealtime && row.kind === "answer") return;

        const promptsCache = qc.getQueryData<{ prompts: AnswerPromptDTO[] }>([
          "prompts",
          sessionId,
        ]);
        const lookupPromptText = (pid: string | null): string | null =>
          pid ? promptsCache?.prompts.find((p) => p.id === pid)?.text ?? null : null;

        for (const [key, prev] of matches) {
          if (!prev) continue;
          const keyDeviceId = (key[2] as string | null) ?? null;
          const idx = prev.toppings.findIndex((t) => t.id === row.id);
          let nextList: ToppingDTO[];

          if (idx >= 0) {
            const existing = prev.toppings[idx];
            const dto = rowToDTO(
              row,
              keyDeviceId,
              lookupPromptText(row.prompt_id) ?? existing.promptText,
              existing,
            );
            if (
              row.prompt_id &&
              row.prompt_id !== existing.promptId &&
              dto.promptText === null
            ) {
              qc.invalidateQueries({ queryKey: ["prompts", sessionId] });
            }
            nextList = prev.toppings.slice();
            nextList[idx] = dto;
          } else {
            if (type === "UPDATE") {
              qc.invalidateQueries({ queryKey: key });
              continue;
            }
            const dto = rowToDTO(row, keyDeviceId, lookupPromptText(row.prompt_id));
            nextList = trimList([dto, ...prev.toppings], softCap);
          }

          const guarded = applyLikeGuards(sessionId, keyDeviceId, nextList);
          qc.setQueryData(key, { ...prev, toppings: guarded });
        }
      } catch {
        qc.invalidateQueries({ queryKey: [keyPrefix, sessionId] });
      }
    });
  }, [sessionId, qc, keyPrefix, skipAnswerRealtime, softCap]);

  const wasUnhealthyRef = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    if (!healthy) {
      wasUnhealthyRef.current = true;
      return;
    }
    if (wasUnhealthyRef.current) {
      wasUnhealthyRef.current = false;
      qc.invalidateQueries({ queryKey: [keyPrefix, sessionId] });
    }
  }, [healthy, sessionId, qc, keyPrefix]);

  const toppings: ToppingDTO[] = data?.toppings ?? [];

  const addTopping = useMutation({
    mutationFn: (input: {
      text: string;
      kind?: "question" | "answer";
      promptId?: string;
    }) => {
      const role: AudienceRole | undefined =
        roleState === "loading" || roleState === "none"
          ? undefined
          : roleState;
      return addFn({
        data: {
          deviceId: deviceId!,
          sessionId: sessionId!,
          text: input.text,
          kind: input.kind,
          promptId: input.promptId,
          role,
        },
      });
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: [keyPrefix, sessionId] });
      qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] });
      // 응답 텍스트 집계 캐시(파이·워드클라우드·응답 카운트) 즉시 갱신
      if (vars.kind === "answer") {
        qc.invalidateQueries({ queryKey: ["answer-texts", sessionId] });
      }
    },
  });

  const toggleLikeMut = useMutation({
    mutationFn: async (
      vars: { toppingId: string; liked: boolean },
    ): Promise<{ ok: true; liked: boolean; likes: number }> => {
      const k = guardKey(sessionId ?? "", deviceId ?? "", vars.toppingId);
      try {
        const opId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "00000000-0000-0000-0000-000000000000";
        const res = await likeFn({
          data: {
            deviceId: deviceId!,
            toppingId: vars.toppingId,
            liked: vars.liked,
            opId,
          },
        });
        return { ok: true, liked: !!res.liked, likes: res.likes ?? 0 };
      } finally {
        inflightLikes.delete(k);
        setPendingLikeIds((prev) => {
          if (!prev.has(vars.toppingId)) return prev;
          const next = new Set(prev);
          next.delete(vars.toppingId);
          return next;
        });
      }
    },
    onMutate: async (vars: { toppingId: string; liked: boolean }) => {
      await qc.cancelQueries({ queryKey: [keyPrefix, sessionId] });
      const snapshots = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: [keyPrefix, sessionId],
      });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<{ toppings: ToppingDTO[] }>(key, {
          ...prev,
          toppings: prev.toppings.map((t) => {
            if (t.id !== vars.toppingId) return t;
            const delta = t.likedByMe === vars.liked ? 0 : vars.liked ? 1 : -1;
            return {
              ...t,
              likedByMe: vars.liked,
              likes: Math.max(0, (t.likes ?? 0) + delta),
            };
          }),
        });
      }
      return { snapshots };
    },
    onError: (e, _v, ctx) => {
      console.error("[toggleLike] failed", e);
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) {
        qc.setQueryData(key, prev);
      }
    },
    onSuccess: (res, vars) => {
      if (!res || !res.ok) return;
      const { liked, likes } = res;
      if (sessionId && deviceId) {
        likeGuards.set(guardKey(sessionId, deviceId, vars.toppingId), {
          liked,
          likes,
          expires: Date.now() + LIKE_GUARD_TTL_MS,
        });
      }
      const matches = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: [keyPrefix, sessionId],
      });
      for (const [key, prev] of matches) {
        if (!prev) continue;
        qc.setQueryData<{ toppings: ToppingDTO[] }>(key, {
          ...prev,
          toppings: prev.toppings.map((t) =>
            t.id === vars.toppingId ? { ...t, likedByMe: liked, likes } : t,
          ),
        });
      }
    },
  });

  const toggleLike = useCallback(
    (toppingId: string) => {
      if (!sessionId || !deviceId) return;
      const k = guardKey(sessionId, deviceId, toppingId);
      if (inflightLikes.has(k)) return;
      const now = Date.now();
      const prevAt = lastLikeAt.get(k) ?? 0;
      if (prevAt !== 0 && now - prevAt < LIKE_COOLDOWN_MS) return;

      const matches = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: [keyPrefix, sessionId],
      });
      let currentLiked: boolean | null = null;
      const guarded = likeGuards.get(k);
      if (guarded && guarded.expires >= now) currentLiked = guarded.liked;
      for (const [, prev] of matches) {
        if (currentLiked !== null) break;
        const t = prev?.toppings.find((x) => x.id === toppingId);
        if (t) {
          currentLiked = t.likedByMe;
          break;
        }
      }
      if (currentLiked === null) return;
      const nextLiked = !currentLiked;

      lastLikeAt.set(k, now);
      inflightLikes.add(k);
      setPendingLikeIds((prev) => {
        if (prev.has(toppingId)) return prev;
        const next = new Set(prev);
        next.add(toppingId);
        return next;
      });
      toggleLikeMut.mutate({ toppingId, liked: nextLiked });
    },
    [sessionId, deviceId, qc, toggleLikeMut, keyPrefix],
  );

  const isLikePending = useCallback(
    (toppingId: string) => pendingLikeIds.has(toppingId),
    [pendingLikeIds],
  );

  const optimisticToggleField = <K extends "pinned" | "addressed">(field: K) => ({
    onMutate: async (toppingId: string) => {
      await qc.cancelQueries({ queryKey: [keyPrefix, sessionId] });
      const snapshots = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: [keyPrefix, sessionId],
      });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<{ toppings: ToppingDTO[] }>(key, {
          ...prev,
          toppings: prev.toppings.map((t) =>
            t.id === toppingId ? { ...t, [field]: !t[field] } : t,
          ),
        });
      }
      return { snapshots };
    },
    onError: (
      e: unknown,
      _v: string,
      ctx: { snapshots: [readonly unknown[], { toppings: ToppingDTO[] } | undefined][] } | undefined,
    ) => {
      console.error(`[toggle:${field}] failed`, e);
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(
        /unauthorized/i.test(msg)
          ? "권한이 필요해요. 발표자 잠금을 다시 해제해 주세요."
          : "변경에 실패했어요. 잠시 후 다시 시도해 주세요.",
      );
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
    },
    onSuccess: (
      res: { ok: boolean; pinned?: boolean; addressed?: boolean; message?: string } | undefined,
      toppingId: string,
      ctx: { snapshots: [readonly unknown[], { toppings: ToppingDTO[] } | undefined][] } | undefined,
    ) => {
      if (!res || res.ok !== true) {
        console.warn(`[toggle:${field}] server rejected`, res);
        toast.error(res?.message ?? "권한이 필요해요. 발표자 잠금을 다시 해제해 주세요.");
        if (ctx) {
          for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
        }
        return;
      }

      const confirmed = (res as Record<string, unknown>)[field] as boolean | undefined;
      if (typeof confirmed !== "boolean") return;
      const matches = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: [keyPrefix, sessionId],
      });
      for (const [key, prev] of matches) {
        if (!prev) continue;
        qc.setQueryData<{ toppings: ToppingDTO[] }>(key, {
          ...prev,
          toppings: prev.toppings.map((t) =>
            t.id === toppingId ? { ...t, [field]: confirmed } : t,
          ),
        });
      }
    },
  });

  const togglePin = useMutation({
    mutationFn: (toppingId: string) =>
      pinFn({ data: { sessionId: sessionId!, toppingId } }),
    ...optimisticToggleField("pinned"),
  });

  const toggleAddressed = useMutation({
    mutationFn: (toppingId: string) =>
      addrFn({ data: { sessionId: sessionId!, toppingId } }),
    ...optimisticToggleField("addressed"),
  });

  const deleteOwnMut = useMutation({
    mutationFn: (toppingId: string) =>
      deleteFn({ data: { deviceId: deviceId!, toppingId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [keyPrefix, sessionId] });
      qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] });
    },
  });

  const submit = useCallback(
    async (text: string, kind: "question" | "answer" = "question", promptId?: string) => {
      const r = await addTopping.mutateAsync({ text, kind, promptId });
      return r;
    },
    [addTopping],
  );

  const deleteOwn = useCallback(
    (toppingId: string) => deleteOwnMut.mutateAsync(toppingId),
    [deleteOwnMut],
  );

  return useMemo(
    () => ({
      toppings,
      ready: !!deviceId && !!sessionId,
      submit,
      isSubmitting: addTopping.isPending,
      toggleLike,
      isLikePending,
      togglePin: togglePin.mutate,
      toggleAddressed: toggleAddressed.mutate,
      deleteOwn,
    }),
    [toppings, deviceId, sessionId, submit, addTopping.isPending, toggleLike, isLikePending, togglePin.mutate, toggleAddressed.mutate, deleteOwn],
  );
}

export function useSessionToppings(sessionId: string | null) {
  return useToppingsCore(sessionId, { mode: "audience" });
}

export function usePresenterToppings(sessionId: string | null) {
  return useToppingsCore(sessionId, { mode: "presenter" });
}
