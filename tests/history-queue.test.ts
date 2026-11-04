import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HistorySendResult } from "@/lib/api/history";
import type { HistoryInput } from "@/lib/history/local";
import {
  HISTORY_BREAKER_COOLDOWN_MS,
  HISTORY_FLUSH_INTERVAL_MS,
  HistoryWriteQueue,
} from "@/lib/history/writeQueue";

function entry(overrides: Partial<HistoryInput> = {}): HistoryInput {
  return {
    mediaType: "movie",
    mediaId: 1,
    title: "Movie",
    progress: 10,
    progressSeconds: 100,
    ...overrides,
  };
}

describe("HistoryWriteQueue", () => {
  let clock = 0;
  let sendResult: HistorySendResult;
  let sendToServer: ReturnType<typeof vi.fn<(input: HistoryInput, keepalive: boolean) => Promise<HistorySendResult>>>;
  let saveLocal: ReturnType<typeof vi.fn<(input: HistoryInput) => void>>;
  let queue: HistoryWriteQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
    sendResult = "saved";
    sendToServer = vi.fn(async () => sendResult);
    saveLocal = vi.fn();
    queue = new HistoryWriteQueue({ sendToServer, saveLocal, now: () => clock });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function advance(ms: number): Promise<void> {
    clock += ms;
    await vi.advanceTimersByTimeAsync(ms);
  }

  it("keeps guest progress local and never calls the server", async () => {
    await queue.queue(entry(), false);

    expect(saveLocal).toHaveBeenCalledTimes(1);
    expect(sendToServer).not.toHaveBeenCalled();
  });

  it("sends the first save of a title immediately", async () => {
    await queue.queue(entry(), true);

    expect(sendToServer).toHaveBeenCalledTimes(1);
    expect(sendToServer).toHaveBeenCalledWith(entry(), false);
  });

  it("holds later saves and sends only the latest one at the flush interval", async () => {
    await queue.queue(entry({ progressSeconds: 100 }), true);
    await queue.queue(entry({ progressSeconds: 130 }), true);
    await queue.queue(entry({ progressSeconds: 160 }), true);

    expect(sendToServer).toHaveBeenCalledTimes(1);

    await advance(HISTORY_FLUSH_INTERVAL_MS);

    expect(sendToServer).toHaveBeenCalledTimes(2);
    expect(sendToServer).toHaveBeenLastCalledWith(entry({ progressSeconds: 160 }), false);
  });

  it("does not resend progress the server already has", async () => {
    await queue.queue(entry(), true);
    await queue.queue(entry(), true);

    await advance(HISTORY_FLUSH_INTERVAL_MS);

    expect(sendToServer).toHaveBeenCalledTimes(1);
  });

  it("flushes the previous title when playback switches to another one", async () => {
    await queue.queue(entry({ mediaId: 1, progressSeconds: 100 }), true);
    await queue.queue(entry({ mediaId: 1, progressSeconds: 400 }), true);
    await queue.queue(entry({ mediaId: 2, title: "Other", progressSeconds: 50 }), true);

    const sentIds = sendToServer.mock.calls.map(([input]) => `${input.mediaId}:${input.progressSeconds}`);

    expect(sentIds).toEqual(["1:100", "1:400", "2:50"]);
  });

  it("passes keepalive through for page-hide flushes", async () => {
    await queue.queue(entry({ progressSeconds: 100 }), true);
    await queue.queue(entry({ progressSeconds: 200 }), true);

    await queue.flush(true);

    expect(sendToServer).toHaveBeenLastCalledWith(entry({ progressSeconds: 200 }), true);
  });

  it("falls back to local storage when the session expired, without stopping future saves", async () => {
    sendResult = "unauthorized";
    await queue.queue(entry({ mediaId: 1 }), true);

    expect(saveLocal).toHaveBeenCalledWith(entry({ mediaId: 1 }));

    sendResult = "saved";
    await queue.queue(entry({ mediaId: 2, title: "Next" }), true);

    expect(sendToServer).toHaveBeenCalledTimes(2);
  });

  it("stops calling the server for a cooldown after a failure, then recovers", async () => {
    sendResult = "failed";
    await queue.queue(entry({ progressSeconds: 100 }), true);

    expect(saveLocal).toHaveBeenCalledWith(entry({ progressSeconds: 100 }));

    await queue.queue(entry({ progressSeconds: 200 }), true);
    await queue.queue(entry({ progressSeconds: 300 }), true);

    expect(sendToServer).toHaveBeenCalledTimes(1);
    expect(saveLocal).toHaveBeenCalledTimes(3);

    sendResult = "saved";
    await advance(HISTORY_BREAKER_COOLDOWN_MS);
    await queue.queue(entry({ progressSeconds: 400 }), true);

    expect(sendToServer).toHaveBeenCalledTimes(2);
  });

  it("forgets what was sent after a reset so a new account gets its progress", async () => {
    await queue.queue(entry(), true);
    queue.reset();
    await queue.queue(entry(), true);

    expect(sendToServer).toHaveBeenCalledTimes(2);
  });
});
