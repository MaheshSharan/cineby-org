import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

export function useServiceWorker(): void {
  useEffect(() => {
    // Development skips the worker so HMR and stale-asset debugging are never affected by it.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
      // Non-fatal: the app works fully without a worker; only installability and the offline page are lost.
    });
  }, []);
}
