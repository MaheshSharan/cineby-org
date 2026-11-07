/** The HTML has arrived. */
export const HTML_RECEIVED_PROGRESS = 20;
/** A client-side navigation has started and waits for its page data. */
export const NAVIGATION_STARTED_PROGRESS = 10;
/** The page is rendered and its visible images start being counted. */
export const PAGE_RENDERED_PROGRESS = 40;

export interface ViewportRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

/** True when any part of a rendered element is inside the viewport. Hidden elements have no size. */
export function isInViewport(rect: ViewportRect, viewportWidth: number, viewportHeight: number): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.top < viewportHeight &&
    rect.right > 0 &&
    rect.left < viewportWidth
  );
}

/** Spreads the progress above `baseProgress` evenly over the images that must finish loading. */
export function computeLoadProgress(settled: number, total: number, baseProgress: number): number {
  if (total === 0) return baseProgress;

  return baseProgress + ((100 - baseProgress) * settled) / total;
}
