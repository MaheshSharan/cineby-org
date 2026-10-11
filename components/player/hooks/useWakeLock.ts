import { useEffect, useRef } from "react";

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

interface NavigatorWithWakeLock {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
}

export function useWakeLock(isActive: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const nav = navigator as unknown as NavigatorWithWakeLock;
    if (!nav.wakeLock?.request) {
      return;
    }

    let isSubscribed = true;

    async function requestLock() {
      if (!nav.wakeLock?.request) return;
      try {
        if (sentinelRef.current && !sentinelRef.current.released) {
          return;
        }
        const sentinel = await nav.wakeLock.request("screen");
        if (!isSubscribed) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // Wake Lock may fail or be rejected (e.g. low battery, background tab)
      }
    }

    async function releaseLock() {
      if (sentinelRef.current && !sentinelRef.current.released) {
        try {
          await sentinelRef.current.release();
        } catch {
          // Ignore release errors
        }
      }
      sentinelRef.current = null;
    }

    if (isActive) {
      void requestLock();
    } else {
      void releaseLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive) {
        void requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isSubscribed = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseLock();
    };
  }, [isActive]);
}
