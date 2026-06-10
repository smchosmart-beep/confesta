import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getSlideState, setSlideState, type SlideStateDTO } from "@/lib/confesta/slides.functions";

const DEFAULT: SlideStateDTO = { slideIndex: 0, slideTotal: 30, paused: false, updatedAt: 0 };

export function useSlideState() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSlideState);
  const setFn = useServerFn(setSlideState);
  const channelId = useId();

  const queryKey = ["slide-state"] as const;
  const { data } = useQuery({
    queryKey,
    queryFn: () => getFn({ data: {} }),
    staleTime: 1_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`slide_state:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slide_state" },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, channelId]);

  const update = useMutation({
    mutationFn: (patch: { slideIndex?: number; slideTotal?: number; paused?: boolean }) =>
      setFn({ data: patch }),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, res.state);
    },
  });

  const state: SlideStateDTO = data ?? DEFAULT;

  return {
    state,
    setSlide: update.mutate,
    next: () => update.mutate({ slideIndex: Math.min(state.slideTotal - 1, state.slideIndex + 1) }),
    prev: () => update.mutate({ slideIndex: Math.max(0, state.slideIndex - 1) }),
    togglePause: () => update.mutate({ paused: !state.paused }),
    reset: () => update.mutate({ slideIndex: 0, paused: false }),
    setTotal: (n: number) => update.mutate({ slideTotal: Math.max(1, n) }),
  };
}
