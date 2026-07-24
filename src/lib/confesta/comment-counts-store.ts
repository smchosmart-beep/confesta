/**
 * Stage 1 GC helper for the comment-events dedupe registry.
 *
 * The actual dedupe map lives inline in `src/hooks/use-topping-comments.ts`
 * (module-scoped `recentCommentEvents`). This module exposes a lazily-populated
 * per-topping index that Stage 3 will maintain when topping delete events land,
 * allowing the dedupe map to purge entries for a removed topping.
 *
 * Stage 1 only ships this module; it is not yet wired to the inline map, so
 * behavior is unchanged. Stage 3 will register entries when comment events are
 * observed and call `dropTopping()` on topping DELETE.
 */

type Unregister = () => void;

const perTopping = new Map<string, Set<Unregister>>();

/** Register a cleanup callback tied to a topping id. */
export function registerToppingCleanup(
  toppingId: string,
  unregister: Unregister,
): void {
  let set = perTopping.get(toppingId);
  if (!set) {
    set = new Set();
    perTopping.set(toppingId, set);
  }
  set.add(unregister);
}

/**
 * Drop every registered entry for a topping.
 * Called when a topping is deleted so downstream caches / dedupe maps can GC.
 */
export function dropTopping(toppingId: string): void {
  const set = perTopping.get(toppingId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn();
    } catch {
      // swallow — GC path must not throw
    }
  }
  perTopping.delete(toppingId);
}

/** Test/diagnostic helper. */
export function _debugSize(): number {
  return perTopping.size;
}
