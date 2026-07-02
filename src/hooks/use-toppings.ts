import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listToppings,
  addTopping as addToppingFn,
  toggleLikeTopping as toggleLikeFn,
  togglePinTopping as togglePinFn,
  toggleAddressedTopping as toggleAddressedFn,
  deleteOwnTopping as deleteOwnFn,
  type ToppingDTO,
} from "@/lib/confesta/toppings.functions";
import type { AudienceRole } from "@/lib/confesta/audienceRole";
import { useDeviceId } from "./use-device-id";
import { useAudienceRole } from "./use-audience-role";
import {
  subscribeToppings,
  useRealtimeHealth,
} from "@/lib/confesta/realtime-channel";

// 모듈 수준 좋아요 보호 구간: RPC commit 직후 refetch가 stale 값으로
// 덮어쓰는 race를 차단. key = `${sessionId}:${deviceId}:${toppingId}`.
const LIKE_GUARD_TTL_MS = 2000;
const likeGuards = new Map<
  string,
  { liked: boolean; likes: number; expires: number }
>();
const guardKey = (s: string, d: string, t: string) => `${s}:${d}:${t}`;
function applyLikeGuards<T extends { id: string; likedByMe: boolean; likes: number }>(
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
// 같은 토핑에 대한 동시 클릭 차단(낙관/서버 race 방지).
const inflightLikes = new Set<string>();
// 짧은 시간 내 연타(모바일 이중 탭 등)로 인한 즉시 취소 방지 쿨다운.
const LIKE_COOLDOWN_MS = 500;
const lastLikeAt = new Map<string, number>();

export function useSessionToppings(sessionId: string | null) {
  const deviceId = useDeviceId();
  const { state: roleState } = useAudienceRole();
  const qc = useQueryClient();
  const listFn = useServerFn(listToppings);
  const addFn = useServerFn(addToppingFn);
  const likeFn = useServerFn(toggleLikeFn);
  const pinFn = useServerFn(togglePinFn);
  const addrFn = useServerFn(toggleAddressedFn);
  const deleteFn = useServerFn(deleteOwnFn);

  const queryKey = ["toppings", sessionId, deviceId] as const;
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
    return subscribeToppings(sessionId, () =>
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] }),
    );
  }, [sessionId, qc]);


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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] });
      qc.invalidateQueries({ queryKey: ["my-toppings", deviceId] });
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (toppingId: string) => {
      const k = guardKey(sessionId ?? "", deviceId ?? "", toppingId);
      if (inflightLikes.has(k)) {
        return { ok: false as const, skipped: true as const };
      }
      inflightLikes.add(k);
      try {
        const opId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : undefined;
        return await likeFn({ data: { deviceId: deviceId!, toppingId, opId } });
      } finally {
        inflightLikes.delete(k);
      }
    },
    // 작성자 본인 포함 모든 청중이 누를 수 있음. 낙관 업데이트로 즉시 반영.
    onMutate: async (toppingId: string) => {
      await qc.cancelQueries({ queryKey: ["toppings", sessionId] });
      const snapshots = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: ["toppings", sessionId],
      });
      for (const [key, prev] of snapshots) {
        if (!prev) continue;
        qc.setQueryData<{ toppings: ToppingDTO[] }>(key, {
          ...prev,
          toppings: prev.toppings.map((t) =>
            t.id === toppingId
              ? {
                  ...t,
                  likedByMe: !t.likedByMe,
                  likes: Math.max(0, (t.likes ?? 0) + (t.likedByMe ? -1 : 1)),
                }
              : t,
          ),
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
    // 서버 응답({ ok, liked, likes })을 캐시에 반영 + 짧은 TTL 보호 구간 설정.
    // 직후의 realtime invalidate→refetch가 stale 값으로 덮어쓰는 것을 차단.
    onSuccess: (res, toppingId) => {
      if (!res || !("ok" in res) || !res.ok) return;
      if ("skipped" in res && res.skipped) return;
      const liked = (res as { liked?: boolean }).liked ?? false;
      const likes = (res as { likes?: number }).likes ?? 0;
      if (sessionId && deviceId) {
        likeGuards.set(guardKey(sessionId, deviceId, toppingId), {
          liked,
          likes,
          expires: Date.now() + LIKE_GUARD_TTL_MS,
        });
      }
      const matches = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: ["toppings", sessionId],
      });
      for (const [key, prev] of matches) {
        if (!prev) continue;
        qc.setQueryData<{ toppings: ToppingDTO[] }>(key, {
          ...prev,
          toppings: prev.toppings.map((t) =>
            t.id === toppingId ? { ...t, likedByMe: liked, likes } : t,
          ),
        });
      }
    },
  });


  // 낙관 업데이트 공통 헬퍼: 특정 boolean 필드를 즉시 토글하고,
  // 서버 확정값으로 patch하거나 실패 시 스냅샷으로 롤백.
  const optimisticToggleField = <K extends "pinned" | "addressed">(field: K) => ({
    onMutate: async (toppingId: string) => {
      await qc.cancelQueries({ queryKey: ["toppings", sessionId] });
      const snapshots = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: ["toppings", sessionId],
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
      _e: unknown,
      _v: string,
      ctx: { snapshots: [readonly unknown[], { toppings: ToppingDTO[] } | undefined][] } | undefined,
    ) => {
      if (!ctx) return;
      for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
    },
    onSuccess: (
      res: { ok: boolean; pinned?: boolean; addressed?: boolean; message?: string } | undefined,
      toppingId: string,
      ctx: { snapshots: [readonly unknown[], { toppings: ToppingDTO[] } | undefined][] } | undefined,
    ) => {
      // 서버 거부(권한/세션 불일치 등): 스냅샷 롤백
      if (!res || res.ok !== true) {
        if (ctx) {
          for (const [key, prev] of ctx.snapshots) qc.setQueryData(key, prev);
        }
        return;
      }
      const confirmed = (res as Record<string, unknown>)[field] as boolean | undefined;
      if (typeof confirmed !== "boolean") return;
      const matches = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
        queryKey: ["toppings", sessionId],
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
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] });
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
      toggleLike: toggleLike.mutate,
      togglePin: togglePin.mutate,
      toggleAddressed: toggleAddressed.mutate,
      deleteOwn,
    }),
    [toppings, deviceId, sessionId, submit, toggleLike.mutate, togglePin.mutate, toggleAddressed.mutate, deleteOwn],
  );
}
