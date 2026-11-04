import { useEffect } from "react";

import { flushHistoryQueue } from "@/lib/history/writeQueue";

/**
 * Sends queued watch progress when the page is hidden or closed, and when the player unmounts
 * (client-side navigation fires neither pagehide nor visibilitychange).
 */
export function useHistoryFlush(): void {
  useEffect(() => {
    function handlePageHide() {
      void flushHistoryQueue({ keepalive: true });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        void flushHistoryQueue({ keepalive: true });
      }
    }

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void flushHistoryQueue();
    };
  }, []);
}
