import { useEffect, useMemo } from "react";
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
import { subscribeToppingComments } from "@/lib/confesta/realtime-channel";
import type { AudienceRole } from "@/lib/confesta/audienceRole";

export function useSessionToppingComments(sessionId: string | null) {
  const deviceId = useDeviceId();
  const { state: roleState } = useAudienceRole();
  const qc = useQueryClient();
  const listFn = useServerFn(listToppingComments);
  const addCommentFn = useServerFn(addFn);
  const deleteOwnCommentFn = useServerFn(deleteOwnFn);
  const deletePresenterCommentFn = useServerFn(deletePresenterFn);

  const queryKey = ["topping-comments", sessionId, deviceId] as const;

  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      listFn({
        data: { sessionId: sessionId!, deviceId: deviceId ?? undefined },
      }),
    enabled: !!sessionId,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    return subscribeToppingComments(sessionId, () =>
      qc.invalidateQueries({ queryKey: ["topping-comments", sessionId] }),
    );
  }, [sessionId, qc]);

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
