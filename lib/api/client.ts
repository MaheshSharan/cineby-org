import { clearLoggedInFlag } from "@/lib/auth/loggedInFlag";

const DEFAULT_TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestInit extends RequestInit {
  timeoutMs?: number;
}

interface TimedSignal {
  signal: AbortSignal;
  release: () => void;
}

// Plain AbortController instead of AbortSignal.timeout/any, which older Safari versions lack.
function createTimedSignal(timeoutMs: number, callerSignal?: AbortSignal | null): TimedSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  function handleCallerAbort() {
    controller.abort(callerSignal?.reason);
  }

  if (callerSignal?.aborted) {
    handleCallerAbort();
  } else {
    callerSignal?.addEventListener("abort", handleCallerAbort, { once: true });
  }

  return {
    signal: controller.signal,
    release: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", handleCallerAbort);
    },
  };
}

/**
 * The single place the app talks to its own API. Adds a timeout so a stalled request cannot hang the
 * UI, and clears the signed-in hint on 401 so the browser stops sending requests that cannot succeed.
 * Returns the raw response; callers decide what a non-2xx status means for them.
 */
export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const timed = createTimedSignal(timeoutMs, signal);

  try {
    const response = await fetch(path, { ...rest, signal: timed.signal });

    if (response.status === 401) {
      clearLoggedInFlag();
    }

    return response;
  } finally {
    timed.release();
  }
}

// Identical GET requests that overlap share one network call (for example several components
// mounting at once and asking for the same list).
const inFlightGets = new Map<string, Promise<unknown>>();

/**
 * GET and parse JSON. Throws ApiError for non-2xx responses.
 * Requests that carry an abort signal are never shared, so cancelling one cannot cancel another.
 */
export async function getJson<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const canShare = !init.signal;
  const shared = canShare ? inFlightGets.get(path) : undefined;
  if (shared) return shared as Promise<T>;

  const request = (async () => {
    const response = await apiFetch(path, init);
    if (!response.ok) {
      throw new ApiError(`Request failed: ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  })();

  if (!canShare) return request;

  inFlightGets.set(path, request);
  try {
    return await request;
  } finally {
    inFlightGets.delete(path);
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

export async function sendJson(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
  init: ApiRequestInit = {}
): Promise<Response> {
  return apiFetch(path, {
    ...init,
    method,
    headers: body === undefined ? init.headers : { "Content-Type": "application/json", ...init.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
