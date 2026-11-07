// Remembers, per device, whether the home page "Continue watching" row had items. It lets the page
// reserve the row's space before history loads and skip a server request for users with no history.
const STATE_KEY = "cineby_continue_state";
const EMPTY_CHECK_TTL_MS = 5 * 60_000;

export interface ContinueState {
  hasItems: boolean;
  checkedAt: number;
}

export function readContinueState(): ContinueState | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return null;

    const hasItems: unknown = Reflect.get(parsed, "hasItems");
    const checkedAt: unknown = Reflect.get(parsed, "checkedAt");
    return typeof hasItems === "boolean" && typeof checkedAt === "number" ? { hasItems, checkedAt } : null;
  } catch {
    return null;
  }
}

export function writeContinueState(hasItems: boolean): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ hasItems, checkedAt: Date.now() }));
  } catch {
    // Storage blocked (private mode): the row simply loads without a reserved slot.
  }

  // The inline script in _document sets this attribute before first paint; keep it in step with the result.
  document.documentElement.toggleAttribute("data-has-continue", hasItems);
}

/** A new save means the row may have changed, so the next home page visit must ask the server. */
export function invalidateContinueState(): void {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    // Storage blocked: nothing was cached, so there is nothing to invalidate.
  }
}

export function canSkipServerLookup(state: ContinueState | null, now: number): boolean {
  return state !== null && !state.hasItems && now - state.checkedAt < EMPTY_CHECK_TTL_MS;
}
