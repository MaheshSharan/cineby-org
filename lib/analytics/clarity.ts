import { isPlayerPath } from "@/lib/ads/placement";

const EXCLUDED_PATHS = new Set(["/login", "/register"]);

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

/** Session recording is off on player pages and on the login and register screens. */
export function isClarityAllowedPath(url: string): boolean {
  const path = url.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
  return !EXCLUDED_PATHS.has(path) && !isPlayerPath(url);
}
