import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAnswerPrompts,
  createAnswerPrompt as createFn,
  updateAnswerPrompt as updateFn,
  closeAnswerPrompt as closeFn,
  reopenAnswerPrompt as reopenFn,
  deleteAnswerPrompt as deleteFnSrv,
  type AnswerPromptDTO,
} from "@/lib/confesta/prompts.functions";

export function useAnswerPrompts(sessionId: string | null) {
  const qc = useQueryClient();
  const listSrv = useServerFn(listAnswerPrompts);
  const createSrv = useServerFn(createFn);
  const updateSrv = useServerFn(updateFn);
  const closeSrv = useServerFn(closeFn);
  const reopenSrv = useServerFn(reopenFn);
  const deleteSrv = useServerFn(deleteFnSrv);
  const channelId = useId();

  const queryKey = ["prompts", sessionId] as const;
  const { data } = useQuery({
    queryKey,
    queryFn: () => listSrv({ data: { sessionId: sessionId! } }),
    enabled: !!sessionId,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`prompts:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answer_prompts", filter: `session_id=eq.${sessionId}` },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, qc]);

  const create = useMutation({
    mutationFn: (text: string) => createSrv({ data: { sessionId: sessionId!, text } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const update = useMutation({
    mutationFn: (input: { promptId: string; text: string }) => updateSrv({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const close = useMutation({
    mutationFn: (promptId: string) => closeSrv({ data: { promptId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const reopen = useMutation({
    mutationFn: (promptId: string) => reopenSrv({ data: { promptId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });
  const remove = useMutation({
    mutationFn: (promptId: string) => deleteSrv({ data: { promptId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const prompts: AnswerPromptDTO[] = data?.prompts ?? [];

  return {
    prompts,
    create: create.mutateAsync,
    update: update.mutate,
    close: close.mutate,
    reopen: reopen.mutate,
    remove: remove.mutate,
  };
}
