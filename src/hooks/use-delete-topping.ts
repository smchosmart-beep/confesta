import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { deleteToppingAsStaff } from "@/lib/confesta/toppings.functions";
import { dropTopping } from "@/lib/confesta/comment-counts-store";

/**
 * Staff-only (presenter or admin) topping delete.
 * - No optimistic update: rely on Realtime DELETE + invalidateQueries
 *   for consistency across all viewers (safer during live events).
 * - Invalidates presenter / audience / admin list caches.
 */
export function useDeleteTopping() {
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteToppingAsStaff);

  return useMutation({
    mutationFn: async (input: { sessionId: string; toppingId: string }) => {
      const res = await deleteFn({ data: input });
      if (!("ok" in res) || !res.ok) {
        throw new Error(
          ("message" in res && (res as { message?: string }).message) ||
            "삭제하지 못했어요",
        );
      }
      return { ...res, sessionId: input.sessionId };
    },
    onSuccess: (res) => {
      // GC dedupe registry entries tied to this topping
      dropTopping(res.toppingId);

      // Refresh every list surface that could show the topping.
      // Broad predicate keeps this resilient to key variants.
      qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey?.[0];
          return (
            k === "toppings-presenter" ||
            k === "toppings" ||
            k === "toppings-admin" ||
            k === "slot-toppings" ||
            k === "slot-aggregates" ||
            k === "comment-counts"
          );
        },
      });
      toast.success("삭제되었어요");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "삭제에 실패했어요";
      toast.error(msg);
    },
  });
}
