import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getJson, isAbortError, sendJson } from "@/lib/api/client";
import { getMediaLogoPath } from "@/lib/api/tmdb";

describe("shared API client", () => {
  let cookie = "";

  beforeEach(() => {
    cookie = "cineby_logged_in=1";
    vi.stubGlobal("document", {
      get cookie() {
        return cookie;
      },
      set cookie(value: string) {
        cookie = value;
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
  }

  it("parses JSON for successful responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({ ok: 1 }));

    expect(await getJson<{ ok: number }>("/api/x")).toEqual({ ok: 1 });
  });

  it("throws an ApiError carrying the status for failed responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 503));

    const error = await getJson("/api/x").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(503);
  });

  it("clears the signed-in hint on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 401));

    await apiFetch("/api/x");

    expect(cookie).not.toContain("cineby_logged_in=1");
  });

  it("leaves the signed-in hint alone on other errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 500));

    await apiFetch("/api/x");

    expect(cookie).toContain("cineby_logged_in=1");
  });

  it("shares one request between identical overlapping GETs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({ n: 1 }));

    const [first, second] = await Promise.all([getJson("/api/same"), getJson("/api/same")]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it("sends a new request once the previous one has finished", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({ n: 1 }));

    await getJson("/api/again");
    await getJson("/api/again");

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not share requests that carry an abort signal", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({}));
    const controller = new AbortController();

    await Promise.all([getJson("/api/signal", { signal: controller.signal }), getJson("/api/signal")]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("gives up on a request that never answers", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        })
    );

    const request = apiFetch("/api/slow", { timeoutMs: 1000 }).catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(1000);

    expect(isAbortError(await request)).toBe(true);
  });

  it("aborts when the caller aborts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        })
    );
    const controller = new AbortController();

    const request = apiFetch("/api/slow", { signal: controller.signal }).catch((caught: unknown) => caught);
    controller.abort(new DOMException("cancelled", "AbortError"));

    expect(isAbortError(await request)).toBe(true);
  });

  it("sends JSON bodies with the right header", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}));

    await sendJson("/api/x", "POST", { a: 1 });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("returns a fallback from API helpers instead of throwing on HTTP errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({}, 404));

    expect(await getMediaLogoPath("movie", 1)).toBeNull();
  });

  it("lets network failures through so callers can decide", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));

    await expect(getMediaLogoPath("movie", 1)).rejects.toThrow("offline");
  });
});
