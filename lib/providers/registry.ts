import { DEFAULT_PROVIDER_TIMEOUT_MS, QUALITY_RANKS } from "./constants";
import { isCircuitOpen, recordFailure, recordSuccess } from "./circuitBreaker";
import { buildStreamProxyUrl } from "./proxy";
import { ALL_PROVIDERS } from "./sources";
import type { Provider, StreamRequest, StreamResponse, StreamSource, SubtitleTrack } from "./types";
import { logError } from "@/lib/logger";

function getEnvVar(name: string): string | undefined {
  if (process.env[name] !== undefined) {
    return process.env[name];
  }
  try {
    const cfContext = (globalThis as unknown as Record<symbol, { env?: Record<string, unknown> }>)[
      Symbol.for("__cloudflare-context__")
    ];
    const val = cfContext?.env?.[name];
    if (typeof val === "string") return val;
  } catch {}
  return undefined;
}

function isProviderEnabled(provider: Provider): boolean {
  const envVar = `ENABLE_${provider.id.toUpperCase()}`;
  const val = getEnvVar(envVar);
  // Enabled by default unless explicitly set to "false" or "0"
  if (val === "false" || val === "0") {
    return false;
  }
  return true;
}

async function fetchWithTimeout(
  provider: Provider,
  request: StreamRequest,
  timeoutMs: number
): Promise<StreamResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onCallerAbort = () => controller.abort();
  // Link caller signal with timeout signal
  if (request.signal) {
    request.signal.addEventListener("abort", onCallerAbort);
  }

  try {
    const res = await provider.fetch({
      ...request,
      signal: controller.signal,
    });
    recordSuccess(provider.id);
    return res;
  } catch (error) {
    if (controller.signal.aborted || request.signal?.aborted) {
      return { sources: [], subtitles: [] };
    }
    recordFailure(provider.id);
    logError(`Provider:${provider.id}`, error);
    return { sources: [], subtitles: [] };
  } finally {
    clearTimeout(timeoutId);
    if (request.signal) {
      request.signal.removeEventListener("abort", onCallerAbort);
    }
  }
}

function processProviderResponse(
  res: StreamResponse,
  provider: Provider
): StreamResponse {
  const collectedSources: StreamSource[] = [];
  const collectedSubtitles: SubtitleTrack[] = [];
  const seenSourceUrls = new Set<string>();
  const seenSubtitleLabels = new Set<string>();

  for (const source of res.sources) {
    if (source.url && !seenSourceUrls.has(source.url)) {
      seenSourceUrls.add(source.url);
      collectedSources.push({
        ...source,
        url: source.direct ? source.url : buildStreamProxyUrl(source.url, source.headers),
        provider: {
          id: source.provider?.id || provider.id,
          name: source.provider?.name || provider.name,
        },
      });
    }
  }

  for (const sub of res.subtitles) {
    const key = `${sub.label.toLowerCase()}_${sub.lang?.toLowerCase() ?? ""}`;
    if (sub.url && !seenSubtitleLabels.has(key)) {
      seenSubtitleLabels.add(key);
      collectedSubtitles.push({
        ...sub,
        flagUrl: sub.flagUrl,
        format: sub.format,
        url: buildStreamProxyUrl(sub.url, sub.headers),
      });
    }
  }

  collectedSources.sort((a, b) => {
    const rankA = QUALITY_RANKS[a.quality] ?? 0;
    const rankB = QUALITY_RANKS[b.quality] ?? 0;
    return rankB - rankA;
  });

  return {
    sources: collectedSources,
    subtitles: collectedSubtitles,
  };
}

export async function resolveAllStreams(
  request: StreamRequest,
  options?: { timeoutMs?: number; targetProviderId?: string; force?: boolean }
): Promise<StreamResponse> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;

  const targetProviders = ALL_PROVIDERS.filter((p) => {
    if (options?.targetProviderId && options.targetProviderId !== "default") {
      const isTarget = p.id === options.targetProviderId || options.targetProviderId.startsWith(`${p.id}-`);
      if (!isTarget) return false;
      if (options.force) return true;
      return isProviderEnabled(p) && !isCircuitOpen(p.id);
    }
    return isProviderEnabled(p) && !isCircuitOpen(p.id);
  });

  if (targetProviders.length === 0) {
    return { sources: [], subtitles: [] };
  }

  // Sort by priority ASC (lower priority number = higher preference)
  targetProviders.sort((a, b) => a.priority - b.priority);

  // If a specific provider is targeted, run directly
  if (options?.targetProviderId && options.targetProviderId !== "default") {
    const provider = targetProviders[0];
    const res = await fetchWithTimeout(
      provider,
      { ...request, serverId: options.targetProviderId },
      timeoutMs
    );
    return processProviderResponse(res, provider);
  }

  // Fastest-viable resolution across prioritized providers
  for (const provider of targetProviders) {
    const res = await fetchWithTimeout(
      provider,
      { ...request, serverId: options?.targetProviderId },
      timeoutMs
    );

    if (res.sources && res.sources.length > 0) {
      return processProviderResponse(res, provider);
    }
  }

  return {
    sources: [],
    subtitles: [],
  };
}

export function listAvailableProviders(): { id: string; name: string }[] {
  return ALL_PROVIDERS.filter((p) => isProviderEnabled(p) && !isCircuitOpen(p.id)).map((p) => ({
    id: p.id,
    name: p.name,
  }));
}

export async function fetchProviderSubtitles(
  request: StreamRequest,
  activeServerId?: string
): Promise<SubtitleTrack[]> {
  // Determine which provider owns the active server
  const provider = activeServerId
    ? ALL_PROVIDERS.find((p) => activeServerId === p.id || activeServerId.startsWith(`${p.id}-`))
    : ALL_PROVIDERS.find((p) => isProviderEnabled(p) && !isCircuitOpen(p.id));

  if (!provider?.fetchSubtitles) {
    return [];
  }

  try {
    const raw = await provider.fetchSubtitles(request);
    const seen = new Set<string>();
    const result: SubtitleTrack[] = [];

    for (const sub of raw) {
      const key = `${sub.label.toLowerCase()}_${sub.lang?.toLowerCase() ?? ""}`;
      if (sub.url && !seen.has(key)) {
        seen.add(key);
        result.push({
          ...sub,
          url: buildStreamProxyUrl(sub.url, sub.headers),
        });
      }
    }

    return result;
  } catch {
    return [];
  }
}
