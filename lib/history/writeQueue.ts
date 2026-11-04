import { postHistoryEntry, type HistorySendResult } from "@/lib/api/history";
import { saveLocalHistory, type HistoryInput } from "@/lib/history/local";

export const HISTORY_FLUSH_INTERVAL_MS = 5 * 60 * 1000;
export const HISTORY_BREAKER_COOLDOWN_MS = 10 * 60 * 1000;

interface SentSnapshot {
  progressSeconds: number;
  seasonNumber: number | null;
  episodeNumber: number | null;
}

export interface HistoryWriteQueueDeps {
  sendToServer: (input: HistoryInput, keepalive: boolean) => Promise<HistorySendResult>;
  saveLocal: (input: HistoryInput) => void;
  now?: () => number;
}

function getTitleKey(input: HistoryInput): string {
  return `${input.mediaType}:${input.mediaId}`;
}

function toSnapshot(input: HistoryInput): SentSnapshot {
  return {
    progressSeconds: input.progressSeconds,
    seasonNumber: input.seasonNumber ?? null,
    episodeNumber: input.episodeNumber ?? null,
  };
}

// Mirrors the server rule: a save only changes the stored row when position or episode differ.
function isAlreadySent(sent: SentSnapshot | undefined, input: HistoryInput): boolean {
  if (!sent) return false;
  const next = toSnapshot(input);
  return (
    sent.progressSeconds === next.progressSeconds &&
    sent.seasonNumber === next.seasonNumber &&
    sent.episodeNumber === next.episodeNumber
  );
}

/**
 * Holds the latest playback progress in memory and sends it to the server in few, deliberate writes:
 * the first save of a title, then at most one every HISTORY_FLUSH_INTERVAL_MS, plus explicit flushes
 * when the title changes or the page is hidden. After a server failure it stops sending for
 * HISTORY_BREAKER_COOLDOWN_MS and keeps progress locally, where the guest-history merge picks it up.
 */
export class HistoryWriteQueue {
  private pending: HistoryInput | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private breakerOpenUntil = 0;
  private readonly lastSent = new Map<string, SentSnapshot>();

  constructor(private readonly deps: HistoryWriteQueueDeps) {}

  queue(input: HistoryInput, isAuthenticated: boolean): Promise<void> {
    if (!isAuthenticated || this.isBreakerOpen()) {
      this.deps.saveLocal(input);
      return Promise.resolve();
    }

    const titleKey = getTitleKey(input);
    const isSwitchingTitle = this.pending !== null && getTitleKey(this.pending) !== titleKey;
    // Flush first: it takes the previous title's progress out of `pending` before it is replaced.
    const previousFlush = isSwitchingTitle ? this.flush() : Promise.resolve();

    this.pending = input;

    if (!this.lastSent.has(titleKey)) {
      return Promise.all([previousFlush, this.flush()]).then(() => undefined);
    }

    this.scheduleFlush();
    return previousFlush;
  }

  async flush(keepalive = false): Promise<void> {
    this.clearTimer();

    const item = this.pending;
    if (!item) return;
    this.pending = null;

    const titleKey = getTitleKey(item);
    if (isAlreadySent(this.lastSent.get(titleKey), item)) return;

    if (this.isBreakerOpen()) {
      this.deps.saveLocal(item);
      return;
    }

    const result = await this.deps.sendToServer(item, keepalive);

    if (result === "saved") {
      this.lastSent.set(titleKey, toSnapshot(item));
      return;
    }

    if (result === "failed") {
      this.breakerOpenUntil = this.now() + HISTORY_BREAKER_COOLDOWN_MS;
    }

    this.deps.saveLocal(item);
  }

  reset(): void {
    this.clearTimer();
    this.pending = null;
    this.breakerOpenUntil = 0;
    this.lastSent.clear();
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private isBreakerOpen(): boolean {
    return this.now() < this.breakerOpenUntil;
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      void this.flush();
    }, HISTORY_FLUSH_INTERVAL_MS);
  }

  private clearTimer(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}

const historyWriteQueue = new HistoryWriteQueue({
  sendToServer: postHistoryEntry,
  saveLocal: saveLocalHistory,
});

export function queueHistorySave(input: HistoryInput, isAuthenticated: boolean): Promise<void> {
  return historyWriteQueue.queue(input, isAuthenticated);
}

export function flushHistoryQueue(options: { keepalive?: boolean } = {}): Promise<void> {
  return historyWriteQueue.flush(options.keepalive ?? false);
}

export function resetHistoryQueue(): void {
  historyWriteQueue.reset();
}
