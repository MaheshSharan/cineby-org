export interface SegmentByteCache {
  get: (key: string) => ArrayBuffer | null;
  set: (key: string, bytes: ArrayBuffer) => void;
  size: () => number;
  clear: () => void;
}

export function createSegmentByteCache(maxBytes = 60_000_000): SegmentByteCache {
  const map = new Map<string, ArrayBuffer>();
  let currentBytes = 0;

  return {
    get(key: string): ArrayBuffer | null {
      const value = map.get(key);
      if (!value) return null;

      // Refresh LRU order on read
      map.delete(key);
      map.set(key, value);
      return value;
    },

    set(key: string, bytes: ArrayBuffer): void {
      if (bytes.byteLength > maxBytes) {
        return;
      }

      const existing = map.get(key);
      if (existing) {
        currentBytes -= existing.byteLength;
        map.delete(key);
      }

      // Evict oldest entries until space is available
      while (currentBytes + bytes.byteLength > maxBytes && map.size > 0) {
        const oldestEntry = map.entries().next();
        if (oldestEntry.done) break;
        const [oldestKey, oldestVal] = oldestEntry.value;
        map.delete(oldestKey);
        currentBytes -= oldestVal.byteLength;
      }

      map.set(key, bytes);
      currentBytes += bytes.byteLength;
    },

    size(): number {
      return currentBytes;
    },

    clear(): void {
      map.clear();
      currentBytes = 0;
    },
  };
}
