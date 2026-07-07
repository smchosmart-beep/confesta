import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listToppingComments,
  addToppingComment as addFn,
  deleteOwnToppingComment as deleteOwnFn,
  deletePresenterToppingComment as deletePresenterFn,
  type CommentDTO,
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
};

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

export function useSessionToppingComments(sessionId: string | null) {
  const deviceId = useDeviceId();
  const { state: roleState } = useAudienceRole();
  const qc = useQueryClient();
  const listFn = useServerFn(listToppingComments);
  const addCommentFn = useServerFn(addFn);
  const deleteOwnCommentFn = useServerFn(deleteOwnFn);
  const deletePresenterCommentFn = useServerFn(deletePresenterFn);

  const queryKey = ["topping-comments", sessionId, deviceId] as const;
  const healthy = useRealtimeHealth("comments", sessionId);

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      listFn({
        data: { sessionId: sessionId!, deviceId: deviceId ?? undefined },
      }),
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
        const matches = qc.getQueriesData<{ comments: CommentDTO[] }>({
          queryKey: ["topping-comments", sessionId],
        });

        if (type === "DELETE") {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (!oldId) return;
          for (const [key, prev] of matches) {
            if (!prev) continue;
            const next = prev.comments.filter((c) => c.id !== oldId);
            if (next.length !== prev.comments.length) {
              qc.setQueryData(key, { comments: next });
            }
          }
          return;
        }

        const row = payload.new as CommentRow | null;
        if (!row?.id) return;

        for (const [key, prev] of matches) {
          if (!prev) continue;
          const keyDeviceId = (key[2] as string | null) ?? null;
          const dto = rowToDTO(row, keyDeviceId);
          const idx = prev.comments.findIndex((c) => c.id === row.id);
          let next: CommentDTO[];
          if (idx >= 0) {
            next = prev.comments.slice();
            next[idx] = dto;
          } else {
            // 서버 정렬: created_at ASC → 뒤에 append
            next = [...prev.comments, dto];
          }
          qc.setQueryData(key, { comments: next });
        }
      } catch {
        qc.invalidateQueries({ queryKey: ["topping-comments", sessionId] });
      }
    });
  }, [sessionId, qc]);

  const wasUnhealthyRef = useRef(false);
  useEffect(() => {
    if (!sessionId) return;
    if (!healthy) {
      wasUnhealthyRef.current = true;
      return;
    }
    if (wasUnhealthyRef.current) {
      wasUnhealthyRef.current = false;
      qc.invalidateQueries({ queryKey: ["topping-comments", sessionId] });
    }
  }, [healthy, sessionId, qc]);

  const comments: CommentDTO[] = data?.comments ?? [];

  const commentsByTopping = useMemo(() => {
    const m = new Map<string, CommentDTO[]>();
    for (const c of comments) {
      const arr = m.get(c.toppingId);
      if (arr) arr.push(c);
      else m.set(c.toppingId, [c]);
    }
    return m;
  }, [comments]);

  const addComment = useMutation({
    mutationFn: (input: { toppingId: string; text: string }) => {
      const role: AudienceRole | undefined =
        roleState === "loading" || roleState === "none" ? undefined : roleState;
      if (!role) throw new Error("역할이 선택되지 않았어요");
      return addCommentFn({
        data: {
          deviceId: deviceId!,
          sessionId: sessionId!,
          toppingId: input.toppingId,
          text: input.text,
          role,
        },
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["topping-comments", sessionId] }),
  });

  const deleteOwnComment = useMutation({
    mutationFn: (commentId: string) =>
      deleteOwnCommentFn({ data: { deviceId: deviceId!, commentId } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["topping-comments", sessionId] }),
  });

  const deletePresenterComment = useMutation({
    mutationFn: (commentId: string) =>
      deletePresenterCommentFn({
        data: { sessionId: sessionId!, commentId },
      }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["topping-comments", sessionId] }),
  });

  return {
    commentsByTopping,
    ready: !!deviceId && !!sessionId,
    canWrite:
      !!deviceId && !!sessionId && roleState !== "loading" && roleState !== "none",
    addComment: (toppingId: string, text: string) =>
      addComment.mutateAsync({ toppingId, text }),
    deleteOwnComment: (commentId: string) =>
      deleteOwnComment.mutateAsync(commentId),
    deletePresenterComment: (commentId: string) =>
      deletePresenterComment.mutateAsync(commentId),
  };
}
