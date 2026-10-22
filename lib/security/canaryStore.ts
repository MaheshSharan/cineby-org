import { getCacheStore } from "@/lib/cache";
import { logger } from "@/lib/logger";

const CANARY_TTL_SECONDS = 10 * 60;

function canaryKey(sid: string): string {
  return `canary:sid:${sid}`;
}

/** Marks one tab's sid as having opened DevTools. Expires on its own. */
export async function flagSid(sid: string): Promise<void> {
  try {
    await getCacheStore().set(canaryKey(sid), true, CANARY_TTL_SECONDS);
  } catch (error) {
    logger.warn("Canary flag write failed", undefined, error);
  }
}

/** Fails open: a cache outage must never block legitimate playback. */
export async function isSidFlagged(sid: string): Promise<boolean> {
  try {
    return (await getCacheStore().get<boolean>(canaryKey(sid))) === true;
  } catch (error) {
    logger.warn("Canary flag read failed", undefined, error);

    return false;
  }
}
