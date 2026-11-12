import { useEffect, useState } from "react";

import { runWhenIdle } from "@/lib/utils/idle";

const REVEAL_AFTER_MS = 2500;

/**
 * Returns the first `initialCount` items for the server render and the first client render, then the full
 * list once the browser is idle. Rows far below the fold hold dozens of cards; drawing them all up front
 * lengthens hydration and the first layout without helping what the visitor can see.
 *
 * The server HTML still links to the first items of every row; crawlers that run scripts see the full list.
 */
export function useDeferredItems<T>(items: readonly T[], initialCount: number): readonly T[] {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => runWhenIdle(() => setIsRevealed(true), REVEAL_AFTER_MS), []);

  return isRevealed ? items : items.slice(0, initialCount);
}
