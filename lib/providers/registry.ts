import { DEFAULT_PROVIDER_TIMEOUT_MS, QUALITY_RANKS } from "./constants";
import { isCircuitOpen, recordFailure, recordSuccess } from "./circuitBreaker";
import { buildStreamProxyUrl } from "./proxy";
import { ALL_PROVIDERS } from "./sources";
import type { Provider, StreamRequest, StreamResponse, StreamSource, SubtitleTrack, ThumbnailTrack } from "./types";
import { logger, logError } from "@/lib/logger";
import { isProviderEnabled } from "@/lib/env/server";
import type { ClientPublicKeyJwk } from "@/lib/security/tabCrypto";

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
  provider: Provider,
  clientIp?: string,
  sid?: string,
  clientPublicKey?: ClientPublicKeyJwk
): StreamResponse {
  const collectedSources: StreamSource[] = [];
  const collectedSubtitles: SubtitleTrack[] = [];
  const collectedThumbnails: ThumbnailTrack[] = [];
  const seenSourceUrls = new Set<string>();
  const seenSubtitleLabels = new Set<string>();
  const seenThumbnailUrls = new Set<string>();

  for (const source of res.sources) {
    if (source.url && !seenSourceUrls.has(source.url)) {
      seenSourceUrls.add(source.url);
      collectedSources.push({
        ...source,
        url: buildStreamProxyUrl(source.url, source.headers, clientIp, sid, clientPublicKey),
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
        url: buildStreamProxyUrl(sub.url, sub.headers, clientIp, sid, clientPublicKey),
      });
    }
  }

  for (const thumb of res.thumbnails ?? []) {
    if (thumb.url && !seenThumbnailUrls.has(thumb.url)) {
      seenThumbnailUrls.add(thumb.url);
      collectedThumbnails.push({
        ...thumb,
        url: buildStreamProxyUrl(thumb.url, thumb.headers, clientIp, sid, clientPublicKey),
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
    thumbnails: collectedThumbnails,
  };
}

export async function resolveAllStreams(
  request: StreamRequest,
  options?: {
    timeoutMs?: number;
    targetProviderId?: string;
    force?: boolean;
    clientIp?: string;
    sid?: string;
    clientPublicKey?: ClientPublicKeyJwk;
  }
): Promise<StreamResponse> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;

  const targetProviders = ALL_PROVIDERS.filter((p) => {
    const enabled = isProviderEnabled(p.id);
    const circuitOpen = isCircuitOpen(p.id);
    logger.debug(`[registry] Provider ${p.id}: enabled=${enabled}, circuitOpen=${circuitOpen}`);

    if (options?.targetProviderId && options.targetProviderId !== "default") {
      const isTarget = p.id === options.targetProviderId || options.targetProviderId.startsWith(`${p.id}-`);
      if (!isTarget) return false;
      if (options.force) return true;
      return enabled && !circuitOpen;
    }
    return enabled && !circuitOpen;
  });

  logger.debug(`[registry] Active targetProviders: [${targetProviders.map((p) => p.id).join(", ")}]`);

  if (targetProviders.length === 0) {
    logger.warn("[registry] No active providers found for request");
    return { sources: [], subtitles: [] };
  }

  // Sort by priority ASC (lower priority number = higher preference)
  targetProviders.sort((a, b) => a.priority - b.priority);

  // If a specific provider is targeted, run directly
  if (options?.targetProviderId && options.targetProviderId !== "default") {
    const provider = targetProviders[0];
    logger.debug(`[registry] Running single target provider: ${provider.id}`);
    const res = await fetchWithTimeout(
      provider,
      { ...request, serverId: options.targetProviderId },
      timeoutMs
    );
    const processed = processProviderResponse(
      res,
      provider,
      options.clientIp,
      options.sid,
      options.clientPublicKey
    );
    logger.debug(`[registry] Provider ${provider.id} produced ${processed.sources.length} sources`);
    return processed;
  }

  // Fastest-viable concurrent resolution across prioritized providers
  return raceProviders(targetProviders, request, timeoutMs, options);
}

const PRIMARY_PROVIDER_GRACE_MS = 1_500;

export async function raceProviders(
  providers: Provider[],
  request: StreamRequest,
  timeoutMs: number,
  options?: {
    targetProviderId?: string;
    clientIp?: string;
    sid?: string;
    clientPublicKey?: ClientPublicKeyJwk;
  }
): Promise<StreamResponse> {
  if (providers.length === 0 || request.signal?.aborted) {
    return { sources: [], subtitles: [] };
  }

  const raceController = new AbortController();
  const onCallerAbort = () => raceController.abort();
  if (request.signal) {
    request.signal.addEventListener("abort", onCallerAbort);
  }

  try {
    const sorted = [...providers].sort((a, b) => a.priority - b.priority);
    const primary = sorted[0];
    const fallbacks = sorted.slice(1);

    const queryProvider = async (provider: Provider): Promise<StreamResponse> => {
      logger.debug(`[registry] Querying provider: ${provider.id}`);
      const res = await fetchWithTimeout(
        provider,
        {
          ...request,
          serverId: options?.targetProviderId,
          signal: raceController.signal,
        },
        timeoutMs
      );

      if (res.sources && res.sources.length > 0) {
        logger.debug(`[registry] Provider ${provider.id} succeeded with ${res.sources.length} sources`);
        return processProviderResponse(
          res,
          provider,
          options?.clientIp,
          options?.sid,
          options?.clientPublicKey
        );
      }

      throw new Error(`Provider ${provider.id} returned no playable sources`);
    };

    if (fallbacks.length === 0) {
      const single = await queryProvider(primary);
      return single;
    }

    // Stagger fallback queries: give the primary (priority 10 Vidy) up to PRIMARY_PROVIDER_GRACE_MS
    // before launching fallbacks concurrently. If primary succeeds fast, zero wasted fallback load.
    const primaryPromise = queryProvider(primary);

    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    const graceTimeoutPromise = new Promise<never>((_, reject) => {
      graceTimer = setTimeout(() => reject(new Error("Primary grace period elapsed")), PRIMARY_PROVIDER_GRACE_MS);
    });

    try {
      const primaryWinner = await Promise.race([primaryPromise, graceTimeoutPromise]);
      clearTimeout(graceTimer);
      raceController.abort();
      return primaryWinner;
    } catch {
      clearTimeout(graceTimer);
    }

    if (raceController.signal.aborted || request.signal?.aborted) {
      return { sources: [], subtitles: [] };
    }

    // Primary either failed or is still resolving past grace window: race primary against fallbacks
    const fallbackPromises = fallbacks.map((f) => queryProvider(f));
    const winner = await Promise.any([primaryPromise, ...fallbackPromises]);
    raceController.abort();
    return winner;
  } catch {
    logger.warn("[registry] All target providers returned 0 sources");
    return { sources: [], subtitles: [] };
  } finally {
    if (request.signal) {
      request.signal.removeEventListener("abort", onCallerAbort);
    }
  }
}

export function listAvailableProviders(): { id: string; name: string }[] {
  return ALL_PROVIDERS.filter((p) => isProviderEnabled(p.id) && !isCircuitOpen(p.id)).map((p) => ({
    id: p.id,
    name: p.name,
  }));
}

export async function fetchProviderSubtitles(
  request: StreamRequest,
  activeServerId?: string,
  clientIp?: string
): Promise<SubtitleTrack[]> {
  // Determine which provider owns the active server
  const provider = activeServerId
    ? ALL_PROVIDERS.find((p) => activeServerId === p.id || activeServerId.startsWith(`${p.id}-`))
    : ALL_PROVIDERS.find((p) => isProviderEnabled(p.id) && !isCircuitOpen(p.id));

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
          url: buildStreamProxyUrl(sub.url, sub.headers, clientIp),
        });
      }
    }

    return result;
  } catch {
    return [];
  }
}
