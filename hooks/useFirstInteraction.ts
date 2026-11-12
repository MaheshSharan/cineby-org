import { useEffect, useState } from "react";

const INTERACTION_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll", "wheel"] as const;

/**
 * True once the visitor has first touched, moved the pointer, pressed a key or scrolled.
 * Use it to hold back third-party scripts that are not needed for the first paint.
 */
export function useFirstInteraction(): boolean {
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (hasInteracted) return;

    const markInteracted = () => setHasInteracted(true);
    for (const eventName of INTERACTION_EVENTS) {
      window.addEventListener(eventName, markInteracted, { once: true, passive: true });
    }

    return () => {
      for (const eventName of INTERACTION_EVENTS) {
        window.removeEventListener(eventName, markInteracted);
      }
    };
  }, [hasInteracted]);

  return hasInteracted;
}
