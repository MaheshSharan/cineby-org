// Pop-up blocking for the embed players. They are cross-origin iframes, so the page cannot see inside them or
// cancel the windows they open. A sandbox without allow-popups / allow-top-navigation makes the browser refuse
// every pop-up, pop-under and tab redirect from the player and from ad frames nested in it.
//
// Some players refuse to run sandboxed. A server that declares `iframe.sandbox` is loaded sandboxed first; when
// it reports no playback in time it is reloaded without the sandbox, and if it then plays, the refusal is
// remembered on this device for a while.

/**
 * No allow-popups, allow-popups-to-escape-sandbox, allow-top-navigation*, allow-modals or allow-downloads.
 * allow-same-origin keeps the player's own storage and requests working; it cannot lift the sandbox because
 * the frame is cross-origin.
 */
export const POPUP_BLOCKING_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock allow-pointer-lock";

/** How long a sandboxed load gets to report playback before it is reloaded without the sandbox. */
export const SANDBOX_CHECK_MS = 12_000;

export const SANDBOX_RETRY_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

const REFUSALS_STORAGE_KEY = "cineby_sandbox_refused";

type RefusalMap = Record<string, number>;

function readRefusals(storage: Storage | null): RefusalMap {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(REFUSALS_STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as RefusalMap) : {};
  } catch {
    return {};
  }
}

function getStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

/** False while this device remembers that the server would not play sandboxed. */
export function canUseSandbox(serverId: string, storage: Storage | null = getStorage(), now = Date.now()): boolean {
  const refusedAt = Number(readRefusals(storage)[serverId]) || 0;
  return !refusedAt || now - refusedAt >= SANDBOX_RETRY_AFTER_MS;
}

export function rememberSandboxRefusal(serverId: string, storage: Storage | null = getStorage(), now = Date.now()): void {
  try {
    storage?.setItem(REFUSALS_STORAGE_KEY, JSON.stringify({ ...readRefusals(storage), [serverId]: now }));
  } catch {
    // Storage can be blocked; the check simply repeats next time.
  }
}
