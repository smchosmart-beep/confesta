import { ToppingScatter } from "./ToppingDecor";

/**
 * Global, fixed-position decorative layer mounted once in __root.
 * Sits behind app content, never intercepts input.
 */
export function BackgroundToppings() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none bg-grad-cream"
    >
      <div className="absolute inset-0 bg-grad-aurora-soft opacity-50" />
      <div className="absolute inset-0 bg-confetti opacity-60" />
      <div className="absolute inset-0">
        <ToppingScatter
          density="high"
          seed="root-bg"
          types={["sprinkle", "star", "cherry", "choc", "heart"]}
        />
      </div>
    </div>
  );
}
