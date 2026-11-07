import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { trackViewportImages } from "@/lib/loading/trackViewportImages";
import {
  HTML_RECEIVED_PROGRESS,
  NAVIGATION_STARTED_PROGRESS,
  PAGE_RENDERED_PROGRESS,
} from "@/lib/loading/viewportProgress";

export interface PageLoadState {
  isVisible: boolean;
  progress: number;
  /** Changes on every new run, so the bar restarts from its new width instead of sliding back. */
  run: number;
}

function isCancelledNavigation(error: unknown): boolean {
  return typeof error === "object" && error !== null && Reflect.get(error, "cancelled") === true;
}

/**
 * Real page-load progress for the first load and for client-side navigations: the HTML arrived,
 * the page rendered, then the share of images in the viewport that finished loading.
 */
export function usePageLoadProgress(): PageLoadState {
  const router = useRouter();
  // The server renders the bar already visible: by the time any of it is shown, the HTML has arrived.
  const [state, setState] = useState<PageLoadState>({ isVisible: true, progress: HTML_RECEIVED_PROGRESS, run: 0 });

  useEffect(() => {
    let stopTracking: (() => void) | null = null;

    const stopCurrentTracking = () => {
      stopTracking?.();
      stopTracking = null;
    };

    const startTracking = (baseProgress: number) => {
      stopCurrentTracking();
      stopTracking = trackViewportImages({
        baseProgress,
        // A run never moves backwards.
        onProgress: (progress) => setState((prev) => ({ ...prev, isVisible: true, progress: Math.max(prev.progress, progress) })),
        onDone: () => setState((prev) => ({ ...prev, isVisible: false, progress: 100 })),
      });
    };

    // Shallow changes (query or hash updates on the same page) load nothing, so they get no bar.
    const handleStart = (_url: string, { shallow }: { shallow: boolean }) => {
      if (shallow) return;

      stopCurrentTracking();
      setState((prev) => ({ isVisible: true, progress: NAVIGATION_STARTED_PROGRESS, run: prev.run + 1 }));
    };

    const handleComplete = (_url: string, { shallow }: { shallow: boolean }) => {
      if (!shallow) startTracking(PAGE_RENDERED_PROGRESS);
    };

    const handleError = (error: unknown) => {
      // A cancelled navigation was replaced by a newer one, which now owns the bar.
      if (isCancelledNavigation(error)) return;

      stopCurrentTracking();
      setState((prev) => ({ ...prev, isVisible: false }));
    };

    startTracking(PAGE_RENDERED_PROGRESS);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleError);

    return () => {
      stopCurrentTracking();
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleError);
    };
  }, [router]);

  return state;
}
