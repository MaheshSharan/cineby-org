// Per-tab session id (sid). It identifies one browser tab to the server so a DevTools canary hit can flag
// that tab only, never a shared IP. It is not a credential: anyone can invent one.

const SID_STORAGE_KEY = "cineby_sid";
const SID_PATTERN = /^[a-f0-9]{32}$/;

let memorySid: string | null = null;

export function isValidSid(value: unknown): value is string {
  return typeof value === "string" && SID_PATTERN.test(value);
}

function createSid(): string {
  return crypto.randomUUID().replaceAll("-", "");
}

/** Stable for the life of the tab (sessionStorage), with an in-memory fallback when storage is blocked. */
export function getTabSid(): string {
  try {
    const stored = window.sessionStorage.getItem(SID_STORAGE_KEY);

    if (isValidSid(stored)) {
      return stored;
    }

    const created = createSid();
    window.sessionStorage.setItem(SID_STORAGE_KEY, created);

    return created;
  } catch {
    // Storage can throw in private or restricted contexts; the sid then lives for this page load only.
    memorySid ??= createSid();

    return memorySid;
  }
}

export function getSidHeaders(): Record<string, string> {
  return { "x-cb-sid": getTabSid() };
}
