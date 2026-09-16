import Hls, {
  type FragmentLoaderContext,
  type HlsConfig,
  type Loader,
  type LoaderCallbacks,
  type LoaderConfiguration,
  type LoaderContext,
  type LoaderResponse,
  type LoaderStats,
} from "hls.js";

import type { SegmentByteCache } from "./segmentByteCache";

function isFragmentContext(context: LoaderContext): context is FragmentLoaderContext {
  return "frag" in context && Boolean((context as FragmentLoaderContext).frag);
}

export function createCachingLoader(
  cache: SegmentByteCache,
  mediaKey: string
): typeof Hls.DefaultConfig.loader {
  return class CachingHlsLoader implements Loader<LoaderContext> {
    private defaultLoader: Loader<LoaderContext>;
    public context: LoaderContext | null = null;
    public stats: LoaderStats;

    constructor(config: HlsConfig) {
      this.defaultLoader = new Hls.DefaultConfig.loader(config);
      this.stats = this.defaultLoader.stats;
    }

    destroy(): void {
      this.defaultLoader.destroy();
      this.context = null;
    }

    abort(): void {
      this.defaultLoader.abort();
    }

    load(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>
    ): void {
      this.context = context;

      // Only cache media fragments (not manifests, playlists, keys, etc.)
      if (!isFragmentContext(context)) {
        this.defaultLoader.load(context, config, callbacks);
        return;
      }

      const frag = context.frag;
      if (typeof frag.sn !== "number" || frag.sn < 0) {
        this.defaultLoader.load(context, config, callbacks);
        return;
      }

      // Build segment identity key: ${mediaKey}:${levelIndex}:${sequenceNumber}
      const cacheKey = `${mediaKey}:${frag.level}:${frag.sn}`;
      const cached = cache.get(cacheKey);

      if (cached) {
        const now = performance.now();
        const stats: LoaderStats = {
          aborted: false,
          loaded: cached.byteLength,
          total: cached.byteLength,
          retry: 0,
          chunkCount: 1,
          bwEstimate: 0,
          loading: { start: now, first: now, end: now },
          parsing: { start: now, end: now },
          buffering: { start: now, first: now, end: now },
        };

        const response: LoaderResponse = {
          url: context.url,
          data: cached,
        };

        callbacks.onSuccess(response, stats, context, null);
        return;
      }

      // Cache miss: delegate to default loader and store segment on success
      const wrappedCallbacks: LoaderCallbacks<LoaderContext> = {
        ...callbacks,
        onSuccess: (response, stats, ctx, networkDetails) => {
          if (response.data instanceof ArrayBuffer) {
            cache.set(cacheKey, response.data);
          }
          callbacks.onSuccess(response, stats, ctx, networkDetails);
        },
      };

      this.defaultLoader.load(context, config, wrappedCallbacks);
    }
  };
}
