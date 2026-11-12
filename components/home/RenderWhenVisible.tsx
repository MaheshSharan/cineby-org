import type { ReactNode } from "react";

import { useInView } from "@/hooks/useInView";

interface RenderWhenVisibleProps {
  children: ReactNode;
  /** Height in pixels held for the block until it mounts, so the page below it does not move. */
  placeholderHeight: number;
}

/**
 * Keeps a block far below the fold out of the server HTML and out of the first hydration. It reserves
 * `placeholderHeight` pixels, then mounts the children shortly before they scroll into view.
 */
export function RenderWhenVisible({ children, placeholderHeight }: RenderWhenVisibleProps) {
  const { ref, isInView } = useInView();

  return (
    <div ref={ref} style={isInView ? undefined : { minHeight: placeholderHeight }}>
      {isInView ? children : null}
    </div>
  );
}
