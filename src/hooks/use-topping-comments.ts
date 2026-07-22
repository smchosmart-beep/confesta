import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listToppingCommentCounts,
  listCommentsByTopping,
  addToppingComment as addFn,
  addPresenterToppingComment as addPresenterFn,
  deleteOwnToppingComment as deleteOwnFn,
  deletePresenterToppingComment as deletePresenterFn,
  type CommentDTO,
  type CommentAuthorKind,
} from "@/lib/confesta/comments.functions";
import { useDeviceId } from "./use-device-id";
import { useAudienceRole } from "./use-audience-role";
import {
  subscribeToppingComments,
  useRealtimeHealth,
  type RealtimePayload,
} from "@/lib/confesta/realtime-channel";
import type { AudienceRole } from "@/lib/confesta/audienceRole";

type CommentRow = {
  id: string;
  topping_id: string;
  session_id: string;
  text: string;
  role: AudienceRole | null;
  device_id: string | null;
  created_at: string;
  author_kind?: string | null;
};

type CountsData = { counts: Record<string, number> };
type ThreadData = { comments: CommentDTO[] };

const RECENT_COMMENT_EVENT_TTL_MS = 30_000;
const recentCommentEvents = new Map<string, number>();

function pruneRecentCommentEvents(now: number) {
  if (recentCommentEvents.size < 500) return;
  for (const [key, expiresAt] of recentCommentEvents) {
    if (expiresAt <= now) recentCommentEvents.delete(key);
  }
}

function claimCommentEvent(
  sessionId: string,
  type: string,
  payload: RealtimePayload,
) {
  if (type !== "INSERT" && type !== "DELETE") return true;

  const row = (type === "DELETE" ? payload.old : payload.new) as {
    id?: string;
  } | null;
  if (!row?.id) return true;

  const now = Date.now();
  pruneRecentCommentEvents(now);
  const key = `${sessionId}:${type}:${row.id}`;
  const expiresAt = recentCommentEvents.get(key) ?? 0;
  if (expiresAt > now) return false;

  recentCommentEvents.set(key, now + RECENT_COMMENT_EVENT_TTL_MS);
  return true;
}

// 진단용: counts가 이전 대비 2 이상 튀는 경우 로그.
// 재현 시 원인 확정 후 제거 예정.
function warnCountJump(
  source: string,
  toppingId: string,
  prev: number,
  next: number,
  extra?: Record<string, unknown>,
) {
  if (Math.abs(next - prev) >= 2) {
    // eslint-disable-next-line no-console
    console.warn("[comment-counts] suspicious jump", {
      source,
      toppingId,
      prev,
      next,
      ...extra,
    });
  }
}


function rowToDTO(r: CommentRow, deviceId: string | null): CommentDTO {
  return {
    id: r.id,
    toppingId: r.topping_id,
    sessionId: r.session_id,
    text: r.text,
    role: (r.role ?? "other") as AudienceRole,
    mine: !!deviceId && r.device_id === deviceId,
    createdAt: new Date(r.created_at).getTime(),
  };
}

/**
 * 세션 진입 시 topping별 댓글 개수만 로드. 본문은 opt-in.
 * Realtime INSERT/DELETE로 카운트 실시간 patch, 열린 thread 캐시도 동기 갱신.
 */
export function useToppingCommentCounts(sessionId: string | null) {
  const qc = useQueryClient();
  const deviceId = useDeviceId();
  const countsFn = useServerFn(listToppingCommentCounts);
  const healthy = useRealtimeHealth("comments", sessionId);

  const queryKey = ["comment-counts", sessionId] as const;

  const { data } = useQuery({
    queryKey,
    queryFn: () => countsFn({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 15_000,
    refetchOnWindowFocus: !healthy,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: healthy ? false : 60_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToppingComments(sessionId, (payload: RealtimePayload) => {
      try {
        const type = payload.eventType;
        if (!claimCommentEvent(sessionId, type, payload)) return;

        if (type === "DELETE") {
          const oldRow = payload.old as { id?: string; topping_id?: string } | null;
          if (!oldRow?.topping_id) return;
          // counts -1
          qc.setQueryData<CountsData>(queryKey, (prev) => {
            if (!prev) return prev;
            const cur = prev.counts[oldRow.topping_id!] ?? 0;
            const next = { ...prev.counts };
            if (cur <= 1) delete next[oldRow.topping_id!];
            else next[oldRow.topping_id!] = cur - 1;
            return { counts: next };
          });
          // 열린 thread에서 제거
          if (oldRow.id) {
            const threads = qc.getQueriesData<ThreadData>({
              queryKey: ["comment-thread", oldRow.topping_id],
            });
            for (const [key, prev] of threads) {
              if (!prev) continue;
              const next = prev.comments.filter((c) => c.id !== oldRow.id);
              if (next.length !== prev.comments.length) {
                qc.setQueryData(key, { comments: next });
              }
            }
          }
          return;
        }

        const row = payload.new as CommentRow | null;
        if (!row?.id || !row.topping_id) return;

        // counts patch — INSERT면 +1, UPDATE면 유지
        if (type === "INSERT") {
          qc.setQueryData<CountsData>(queryKey, (prev) => {
            if (!prev) return prev;
            const cur = prev.counts[row.topping_id] ?? 0;
            const nextVal = cur + 1;
            warnCountJump("realtime-insert", row.topping_id, cur, nextVal, {
              rowId: row.id,
            });
            return { counts: { ...prev.counts, [row.topping_id]: nextVal } };
          });
        }


        // 열린 thread에 upsert (id dedupe)
        const threads = qc.getQueriesData<ThreadData>({
          queryKey: ["comment-thread", row.topping_id],
        });
        for (const [key, prev] of threads) {
          if (!prev) continue;
          const keyDeviceId = (key[2] as string | null) ?? null;
          const dto = rowToDTO(row, keyDeviceId);
          const idx = prev.comments.findIndex((c) => c.id === row.id);
          let next: CommentDTO[];
          if (idx >= 0) {
            next = prev.comments.slice();
            next[idx] = dto;
          } else {
            next = [...prev.comments, dto];
          }
          qc.setQueryData(key, { comments: next });
        }
      } catch {
        qc.invalidateQueries({ queryKey });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, qc]);

  const getCount = useCallback(
    (toppingId: string) => data?.counts?.[toppingId] ?? 0,
    [data],
  );

  return { getCount, ready: !!deviceId && !!sessionId };
}

/**
 * 특정 topping의 댓글 본문. enabled=false면 fetch/subscribe 없음.
 * 뮤테이션은 낙관적 업데이트 + Realtime dedupe로 서버 함수 호출 최소화.
 */
export function useToppingCommentThread(
  sessionId: string | null,
  toppingId: string | null,
  enabled: boolean,
) {
  const qc = useQueryClient();
  const deviceId = useDeviceId();
  const { state: roleState } = useAudienceRole();
  const threadFn = useServerFn(listCommentsByTopping);
  const addCommentFn = useServerFn(addFn);
  const deleteOwnCommentFn = useServerFn(deleteOwnFn);
  const deletePresenterCommentFn = useServerFn(deletePresenterFn);
  const healthy = useRealtimeHealth("comments", sessionId);

  const threadKey = ["comment-thread", toppingId, deviceId] as const;
  const countsKey = ["comment-counts", sessionId] as const;

  const { data, isFetching } = useQuery({
    queryKey: threadKey,
    queryFn: () =>
      threadFn({
        data: { toppingId: toppingId!, deviceId: deviceId ?? undefined },
      }),
    enabled: enabled && !!toppingId && !!deviceId,
    staleTime: 15_000,
    refetchOnWindowFocus: !healthy,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false,
    refetchInterval: enabled && !healthy ? 60_000 : false,
  });

  const comments: CommentDTO[] = data?.comments ?? [];

  const addComment = useMutation({
    mutationFn: async (input: { text: string }) => {
      const role: AudienceRole | undefined =
        roleState === "loading" || roleState === "none" ? undefined : roleState;
      if (!role) throw new Error("역할이 선택되지 않았어요");
      return addCommentFn({
        data: {
          deviceId: deviceId!,
          sessionId: sessionId!,
          toppingId: toppingId!,
          text: input.text,
          role,
        },
      });
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: threadKey });
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const role: AudienceRole =
        roleState === "loading" || roleState === "none"
          ? "other"
          : (roleState as AudienceRole);
      const optimistic: CommentDTO = {
        id: tempId,
        toppingId: toppingId!,
        sessionId: sessionId!,
        text: input.text,
        role,
        mine: true,
        createdAt: Date.now(),
      };
      const prevThread = qc.getQueryData<ThreadData>(threadKey);
      qc.setQueryData<ThreadData>(threadKey, (prev) => ({
        comments: [...(prev?.comments ?? []), optimistic],
      }));
      const prevCounts = qc.getQueryData<CountsData>(countsKey);
      qc.setQueryData<CountsData>(countsKey, (prev) => {
        if (!prev) return prev;
        const cur = prev.counts[toppingId!] ?? 0;
        const nextVal = cur + 1;
        warnCountJump("mutate-add", toppingId!, cur, nextVal);
        return { counts: { ...prev.counts, [toppingId!]: nextVal } };
      });
      return { tempId, prevThread, prevCounts };
    },
    onError: (_e, _input, ctx) => {
      if (!ctx) return;
      if (ctx.prevThread) qc.setQueryData(threadKey, ctx.prevThread);
      if (ctx.prevCounts) qc.setQueryData(countsKey, ctx.prevCounts);
    },
    onSuccess: (_result, _input, ctx) => {
      // 임시 항목 제거. 실제 row는 Realtime INSERT로 도착하여 upsert됨.
      if (ctx?.tempId) {
        qc.setQueryData<ThreadData>(threadKey, (prev) => {
          if (!prev) return prev;
          return { comments: prev.comments.filter((c) => c.id !== ctx.tempId) };
        });
      }
      // Realtime 지연 대비 안전망: 열린 thread를 서버 실값으로 재수렴.
      qc.invalidateQueries({ queryKey: ["comment-thread", toppingId] });
      // counts는 낙관 +1을 유지. 최종 정합은 onSettled의 invalidate가 담당.
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: countsKey });
    },

  });

  const deleteOwnComment = useMutation({
    mutationFn: (commentId: string) =>
      deleteOwnCommentFn({ data: { deviceId: deviceId!, commentId } }),
    onMutate: async (commentId: string) => {
      await qc.cancelQueries({ queryKey: threadKey });
      const prevThread = qc.getQueryData<ThreadData>(threadKey);
      const prevCounts = qc.getQueryData<CountsData>(countsKey);
      qc.setQueryData<ThreadData>(threadKey, (prev) =>
        prev
          ? { comments: prev.comments.filter((c) => c.id !== commentId) }
          : prev,
      );
      qc.setQueryData<CountsData>(countsKey, (prev) => {
        if (!prev) return prev;
        const cur = prev.counts[toppingId!] ?? 0;
        const nextVal = Math.max(0, cur - 1);
        warnCountJump("mutate-delete-own", toppingId!, cur, nextVal);
        return { counts: { ...prev.counts, [toppingId!]: nextVal } };
      });
      return { prevThread, prevCounts };
    },
    onError: (_e, _id, ctx) => {
      if (!ctx) return;
      if (ctx.prevThread) qc.setQueryData(threadKey, ctx.prevThread);
      if (ctx.prevCounts) qc.setQueryData(countsKey, ctx.prevCounts);
    },
    onSuccess: (result, _id, ctx) => {
      // 서버가 거절(!ok)한 경우 복원
      if (!result?.ok && ctx) {
        if (ctx.prevThread) qc.setQueryData(threadKey, ctx.prevThread);
        if (ctx.prevCounts) qc.setQueryData(countsKey, ctx.prevCounts);
      }
      // 성공 시 counts는 낙관 -1을 유지. 최종 정합은 onSettled의 invalidate가 담당.
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: countsKey });
    },
  });


  const deletePresenterComment = useMutation({
    mutationFn: (commentId: string) =>
      deletePresenterCommentFn({
        data: { sessionId: sessionId!, commentId },
      }),
    onMutate: async (commentId: string) => {
      await qc.cancelQueries({ queryKey: threadKey });
      const prevThread = qc.getQueryData<ThreadData>(threadKey);
      const prevCounts = qc.getQueryData<CountsData>(countsKey);
      qc.setQueryData<ThreadData>(threadKey, (prev) =>
        prev
          ? { comments: prev.comments.filter((c) => c.id !== commentId) }
          : prev,
      );
      qc.setQueryData<CountsData>(countsKey, (prev) => {
        if (!prev) return prev;
        const cur = prev.counts[toppingId!] ?? 0;
        const nextVal = Math.max(0, cur - 1);
        warnCountJump("mutate-delete-presenter", toppingId!, cur, nextVal);
        return { counts: { ...prev.counts, [toppingId!]: nextVal } };
      });
      return { prevThread, prevCounts };
    },
    onError: (_e, _id, ctx) => {
      if (!ctx) return;
      if (ctx.prevThread) qc.setQueryData(threadKey, ctx.prevThread);
      if (ctx.prevCounts) qc.setQueryData(countsKey, ctx.prevCounts);
    },
    onSuccess: (result, _id, ctx) => {
      if (!result?.ok && ctx) {
        if (ctx.prevThread) qc.setQueryData(threadKey, ctx.prevThread);
        if (ctx.prevCounts) qc.setQueryData(countsKey, ctx.prevCounts);
      }
      // 성공 시 counts는 낙관 -1을 유지. 최종 정합은 onSettled의 invalidate가 담당.
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: countsKey });
    },
  });


  return {
    comments,
    isFetching,
    ready: !!deviceId && !!sessionId && !!toppingId,
    canWrite:
      !!deviceId && !!sessionId && roleState !== "loading" && roleState !== "none",
    addComment: (text: string) => addComment.mutateAsync({ text }),
    deleteOwnComment: (commentId: string) => deleteOwnComment.mutateAsync(commentId),
    deletePresenterComment: (commentId: string) =>
      deletePresenterComment.mutateAsync(commentId),
  };
}
