import { useEffect, useState } from "react";

const SERVICE_WORKER_URL = "/sw.js";
// Browsers already re-check the worker on every page load; resuming an installed app only needs a check now and then.
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

interface UseServiceWorkerResult {
  /** A newer version of the app took control while this page was still running the old code. */
  isUpdateReady: boolean;
}

export function useServiceWorker(): UseServiceWorkerResult {
  const [isUpdateReady, setIsUpdateReady] = useState(false);

  useEffect(() => {
    // Development skips the worker so HMR and stale-asset debugging are never affected by it.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    // On a first visit the worker also takes control, which is not an update.
    const hadController = navigator.serviceWorker.controller !== null;
    let registration: ServiceWorkerRegistration | undefined;
    let lastUpdateCheck = Date.now();

    function handleControllerChange() {
      if (hadController) setIsUpdateReady(true);
    }

    // Installed apps are resumed rather than reloaded, so the browser would not look for a new worker.
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;

      lastUpdateCheck = Date.now();
      registration?.update().catch(() => {
        // Offline checks are expected to fail; the next resume tries again.
      });
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    navigator.serviceWorker
      .register(SERVICE_WORKER_URL)
      .then((created) => {
        registration = created;
      })
      .catch(() => {
        // Non-fatal: the app works fully without a worker; only installability and the offline page are lost.
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { isUpdateReady };
}
