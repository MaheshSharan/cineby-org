import { useEffect } from "react";

const LAST_CHECK_KEY = "cineby_vc";
const RELOADED_FOR_KEY = "cineby_vr";
const MIN_CHECK_INTERVAL_MS = 2 * 60 * 1000;
const BUILD_ID_PATTERN = /^[0-9a-f]{12}$/;

function isCheckDue(): boolean {
  try {
    const lastCheck = Number(sessionStorage.getItem(LAST_CHECK_KEY));
    if (Date.now() - lastCheck < MIN_CHECK_INTERVAL_MS) return false;
    sessionStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    // Storage is blocked: check anyway, since the check is a single static file request.
  }
  return true;
}

function reloadOnce(latestBuildId: string): void {
  try {
    if (sessionStorage.getItem(RELOADED_FOR_KEY) === latestBuildId) return;
    sessionStorage.setItem(RELOADED_FOR_KEY, latestBuildId);
  } catch {
    return;
  }
  window.location.reload();
}

/**
 * A page cached before a deploy points at asset files the new build no longer has, which leaves it unstyled.
 * Compares the build id inside this page with the one in the static file of the live build and reloads once on a mismatch.
 */
export function useBuildFreshness(): void {
  useEffect(() => {
    const currentBuildId = window.__NEXT_DATA__?.buildId;
    if (!currentBuildId || !isCheckDue()) return;

    fetch("/v.txt", { cache: "reload" })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        const latestBuildId = text.trim();
        if (BUILD_ID_PATTERN.test(latestBuildId) && latestBuildId !== currentBuildId) {
          reloadOnce(latestBuildId);
        }
      })
      .catch(() => {
        // Offline or blocked: the page keeps working, and the next visit checks again.
      });
  }, []);
}
