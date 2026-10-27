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
import { signSegmentUrl } from "@/lib/security/tabCrypto";
import { registerWorkerOrigin, getFallbackProxyUrl } from "./clientProxyPool";

function isFragmentContext(context: LoaderContext): context is FragmentLoaderContext {
  return "frag" in context && Boolean((context as FragmentLoaderContext).frag);
}

export function createCachingLoader(
  cache: SegmentByteCache,
  mediaKey: string
): typeof Hls.DefaultConfig.loader {
  return class CachingHlsLoader implements Loader<LoaderContext> {
    private defaultLoader: Loader<LoaderContext>;
    private hlsConfig: HlsConfig;
    public context: LoaderContext | null = null;
    public stats: LoaderStats;

    constructor(config: HlsConfig) {
      this.hlsConfig = config;
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

      if (context.url.includes("bright67.online")) {
        if (context.url.includes("master.m3u8") || context.url.includes("playlist.jpg")) {
          context.responseType = "text";
        } else {
          context.responseType = "arraybuffer";
        }
      }

      // Learn live worker domains as URLs stream in
      registerWorkerOrigin(context.url);

      const resilientCallbacks: LoaderCallbacks<LoaderContext> = {
        ...callbacks,
        onError: (error, ctx, networkDetails, stats) => {
          const status = error.code;
          // HTTP 429 (Worker quota exhausted), 502, 503, or 0 (CORS / network fail when Cloudflare blocks worker)
          if (status === 429 || status === 502 || status === 503 || status === 0) {
            const fallbackUrl = getFallbackProxyUrl(ctx.url);
            if (fallbackUrl && fallbackUrl !== ctx.url) {
              ctx.url = fallbackUrl;
              this.defaultLoader.destroy();
              this.defaultLoader = new Hls.DefaultConfig.loader(this.hlsConfig);
              this.defaultLoader.load(ctx, config, resilientCallbacks);
              return;
            }
          }
          callbacks.onError(error, ctx, networkDetails, stats);
        },
      };

      // Only cache media fragments (not manifests, playlists, keys, etc.)
      if (!isFragmentContext(context)) {
        if (context.url.includes("token=")) {
          void signSegmentUrl(context.url)
            .then((signedUrl) => {
              context.url = signedUrl;
              this.defaultLoader.load(context, config, resilientCallbacks);
            })
            .catch(() => {
              this.defaultLoader.load(context, config, resilientCallbacks);
            });
          return;
        }

        this.defaultLoader.load(context, config, resilientCallbacks);
        return;
      }

      const frag = context.frag;
      if (typeof frag.sn !== "number" || frag.sn < 0) {
        if (context.url.includes("token=")) {
          void signSegmentUrl(context.url)
            .then((signedUrl) => {
              context.url = signedUrl;
              this.defaultLoader.load(context, config, resilientCallbacks);
            })
            .catch(() => {
              this.defaultLoader.load(context, config, resilientCallbacks);
            });
          return;
        }

        this.defaultLoader.load(context, config, resilientCallbacks);
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

      // Learn live worker domains as chunks stream in
      registerWorkerOrigin(context.url);

      // Cache miss: delegate to default loader with circuit breaker fallback on 429/network errors
      const wrappedCallbacks: LoaderCallbacks<LoaderContext> = {
        ...callbacks,
        onSuccess: (response, stats, ctx, networkDetails) => {
          if (response.data instanceof ArrayBuffer) {
            cache.set(cacheKey, response.data);
          }
          callbacks.onSuccess(response, stats, ctx, networkDetails);
        },
        onError: (error, ctx, networkDetails, stats) => {
          const status = error.code;
          // HTTP 429 (Worker quota exhausted), 502, 503, or 0 (CORS / network fail when Cloudflare blocks worker)
          if (status === 429 || status === 502 || status === 503 || status === 0) {
            const fallbackUrl = getFallbackProxyUrl(ctx.url);
            if (fallbackUrl && fallbackUrl !== ctx.url) {
              ctx.url = fallbackUrl;
              this.defaultLoader.destroy();
              this.defaultLoader = new Hls.DefaultConfig.loader(this.hlsConfig);
              this.defaultLoader.load(ctx, config, wrappedCallbacks);
              return;
            }
          }
          callbacks.onError(error, ctx, networkDetails, stats);
        },
      };

      if (context.url.includes("token=")) {
        void signSegmentUrl(context.url)
          .then((signedUrl) => {
            context.url = signedUrl;
            this.defaultLoader.load(context, config, wrappedCallbacks);
          })
          .catch(() => {
            this.defaultLoader.load(context, config, wrappedCallbacks);
          });
        return;
      }

      this.defaultLoader.load(context, config, wrappedCallbacks);
    }
  };
}
