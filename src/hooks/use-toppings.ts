import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  listToppings,
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

// v2 서버 필터를 유지하기 위한 클라 측 소프트 캡. 200건 초과 시 우선순위
// (kind='answer' || pinned || addressed) 항목은 모두 유지하고, 나머지 신규 목록
// 앞에서부터 채워 상한선을 유지한다. 정합성은 focus/reconnect resync로 수렴.
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

// 모듈 수준 좋아요 보호 구간: RPC commit 직후 refetch가 stale 값으로
// 덮어쓰는 race를 차단. key = `${sessionId}:${deviceId}:${toppingId}`.
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
// 같은 토핑에 대한 동시 클릭 차단(낙관/서버 race 방지).
const inflightLikes = new Set<string>();
// onMutate가 skip으로 결정한 클릭을 mutationFn에 신호하기 위한 마킹.
// (react-query는 onMutate → mutationFn 컨텍스트 전달 수단이 없으므로 모듈 Set 사용)
const skippedLikeIds = new Set<string>();
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
    return subscribeToppings(sessionId, (payload: RealtimePayload) => {
      try {
        const type = payload.eventType;
        const matches = qc.getQueriesData<{ toppings: ToppingDTO[] }>({
          queryKey: ["toppings", sessionId],
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

        // prompt_text는 join 결과라 payload에 없음 → prompts 캐시에서 조회
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
            // UPDATE (또는 INSERT dedupe): 기존 promptText·likedByMe 보존
            const existing = prev.toppings[idx];
            const dto = rowToDTO(
              row,
              keyDeviceId,
              lookupPromptText(row.prompt_id) ?? existing.promptText,
              existing,
            );
            // prompt_id가 바뀌었는데 새 프롬프트가 캐시에 없으면 promptText 안전망 재조회
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
              // 서버 필터에 걸려 있던 항목이 UPDATE로 조건 진입 → 정확 복제 어려움
              qc.invalidateQueries({ queryKey: key });
              continue;
            }
            // INSERT: created_at DESC 리스트의 맨 앞에 삽입
            const dto = rowToDTO(row, keyDeviceId, lookupPromptText(row.prompt_id));
            nextList = trimList([dto, ...prev.toppings]);
          }

          const guarded = applyLikeGuards(sessionId, keyDeviceId, nextList);
          qc.setQueryData(key, { ...prev, toppings: guarded });
        }
      } catch {
        qc.invalidateQueries({ queryKey: ["toppings", sessionId] });
      }
    });
  }, [sessionId, qc]);

  // 채널 재연결 시 놓친 이벤트 동기화 (false→true 전이만)
  const wasUnhealthyRef = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    if (!healthy) {
      wasUnhealthyRef.current = true;
      return;
    }
    if (wasUnhealthyRef.current) {
      wasUnhealthyRef.current = false;
      qc.invalidateQueries({ queryKey: ["toppings", sessionId] });
    }
  }, [healthy, sessionId, qc]);



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
    // onMutate에서 skipped 판정 → mutationFn은 그 결정을 그대로 존중.
    // 이렇게 하면 낙관 업데이트가 되었는데 서버 요청이 스킵되는(그리고
    // 실시간 재조회로 되돌려지는) 불일치 자체가 발생하지 않는다.
    mutationFn: async (
      toppingId: string,
    ): Promise<
      | { ok: true; liked: boolean; likes: number }
      | { ok: false; skipped: true }
    > => {
      const k = guardKey(sessionId ?? "", deviceId ?? "", toppingId);
      // onMutate에서 이미 lastLikeAt.set(now) 처리되었는지로 통과 여부를 판단.
      // 통과된 클릭이 아니면 서버 호출 없이 스킵 반환.
      if (inflightLikes.has(k)) {
        return { ok: false, skipped: true };
      }
      inflightLikes.add(k);
      try {
        const opId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : undefined;
        const res = await likeFn({
          data: { deviceId: deviceId!, toppingId, opId },
        });
        return { ok: true, liked: !!res.liked, likes: res.likes ?? 0 };
      } finally {
        inflightLikes.delete(k);
      }
    },
    // 작성자 본인 포함 모든 청중이 누를 수 있음. 낙관 업데이트로 즉시 반영.
    // 쿨다운 판정을 여기서 단일 결정하고, 통과된 클릭만 lastLikeAt/낙관업데이트를 진행.
    onMutate: async (toppingId: string) => {
      const k = guardKey(sessionId ?? "", deviceId ?? "", toppingId);
      const now = Date.now();
      const prevAt = lastLikeAt.get(k) ?? 0;
      // 첫 클릭(prevAt===0)은 절대 스킵되지 않음. 이후 500ms 이내 재클릭만 스킵.
      if (prevAt !== 0 && now - prevAt < LIKE_COOLDOWN_MS) {
        return {
          skipped: true as const,
          snapshots: [] as [readonly unknown[], { toppings: ToppingDTO[] } | undefined][],
        };
      }
      // 통과된 클릭만 타임스탬프 갱신 + 인플라이트 마킹.
      lastLikeAt.set(k, now);
      inflightLikes.add(k);

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
      return { skipped: false as const, snapshots };
    },
    onError: (e, _v, ctx) => {
      console.error("[toggleLike] failed", e);
      if (!ctx || ctx.skipped) return;
      for (const [key, prev] of ctx.snapshots) {
        qc.setQueryData(key, prev);
      }
    },
    // 서버 응답({ ok, liked, likes })을 캐시에 반영 + 짧은 TTL 보호 구간 설정.
    // 직후의 realtime invalidate→refetch가 stale 값으로 덮어쓰는 것을 차단.
    onSuccess: (res, toppingId, ctx) => {
      if (ctx?.skipped) return;
      if (!res || !res.ok) return;
      const { liked, likes } = res;
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
      // 서버 거부(권한/세션 불일치 등): 스냅샷 롤백
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
      isSubmitting: addTopping.isPending,
      toggleLike: toggleLike.mutate,
      togglePin: togglePin.mutate,
      toggleAddressed: toggleAddressed.mutate,
      deleteOwn,
    }),
    [toppings, deviceId, sessionId, submit, addTopping.isPending, toggleLike.mutate, togglePin.mutate, toggleAddressed.mutate, deleteOwn],
  );
}
