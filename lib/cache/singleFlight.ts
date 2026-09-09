/**
 * Lightweight Single-Flight / Request Coalescing helper.
 * Prevents cache stampedes by ensuring concurrent identical asynchronous requests
 * share one underlying inflight Promise.
 */
export class SingleFlight {
  private inFlight = new Map<string, Promise<unknown>>();

  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  get pendingCount(): number {
    return this.inFlight.size;
  }
}
