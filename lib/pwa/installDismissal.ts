import { INSTALL_DISMISS_DAYS, INSTALL_DISMISSED_STORAGE_KEY } from "@/lib/constants/pwa";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isDismissalActive(dismissedAt: number | null, now: number): boolean {
  return dismissedAt !== null && now - dismissedAt < INSTALL_DISMISS_DAYS * MS_PER_DAY;
}

export function readInstallDismissal(): number | null {
  try {
    const dismissedAt = Number(localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY));
    return Number.isFinite(dismissedAt) && dismissedAt > 0 ? dismissedAt : null;
  } catch {
    // Storage can be blocked (private mode); the banner then simply reappears next visit.
    return null;
  }
}

export function rememberInstallDismissal(now: number): void {
  try {
    localStorage.setItem(INSTALL_DISMISSED_STORAGE_KEY, String(now));
  } catch {
    // Storage can be blocked (private mode); the dismissal then only lasts for this visit.
  }
}
