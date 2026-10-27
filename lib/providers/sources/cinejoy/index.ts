import { logger, logError } from "@/lib/logger";
import type {
  Provider,
  Quality,
  StreamRequest,
  StreamResponse,
  StreamSource,
  SubtitleTrack,
} from "@/lib/providers/types";
import { getActiveCinejoyServers } from "./servers";
import { resolveWingStream } from "./resolver";

const PROVIDER_ID = "cinejoy";
const PROVIDER_NAME = "Cinejoy";
const PROVIDER_PRIORITY = 5;

/**
 * Normalizes Cinejoy child server identifier to the exact name expected by api.wing.st.
 * Accepts both prefixed (e.g. "cinejoy-nebula", "cinejoy-secret") and plain (e.g. "Nebula").
 */
function normalizeServerName(serverId?: string): string {
  if (!serverId) return "Nebula";
  const stripped = serverId.replace(/^cinejoy-/, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Probe stream URL with a range request to ensure it is playable before returning to user.
 */
async function isStreamPlayable(url: string, signal?: AbortSignal): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 750);
  const onParentAbort = () => controller.abort();
  if (signal) signal.addEventListener("abort", onParentAbort);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-100" },
      signal: controller.signal,
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  }
}

async function scrapeServer(serverName: string, req: StreamRequest, is4k = false): Promise<StreamResponse> {
  try {
    const streams = await resolveWingStream(
      serverName,
      req.type,
      req.tmdbId,
      req.season,
      req.episode,
      req.signal
    );

    const primary = streams.find((s) => s.type === "hls" && s.playlist);
    if (!primary) {
      return { sources: [], subtitles: [] };
    }

    const quality: Quality = is4k ? "2160p" : "1080p";
    const sources: StreamSource[] = [
      {
        url: primary.playlist,
        direct: true,
        type: "hls",
        quality,
        provider: {
          id: `cinejoy-${serverName.toLowerCase()}`,
          name: `Cinejoy - ${serverName}`,
        },
      },
    ];

    const subtitles: SubtitleTrack[] = (primary.captions ?? []).map((c, idx) => ({
      id: `cinejoy-sub-${idx}`,
      url: c.url,
      lang: c.language || "und",
      label: c.language ? c.language.toUpperCase() : `Subtitle ${idx + 1}`,
      format: "vtt",
    }));

    return { sources, subtitles };
  } catch (err) {
    logError(`Provider:cinejoy:${serverName}`, err);
    return { sources: [], subtitles: [] };
  }
}

async function scrape(req: StreamRequest): Promise<StreamResponse> {
  if (req.serverId && req.serverId !== "default" && req.serverId !== "cinejoy") {
    const serverName = normalizeServerName(req.serverId);
    const is4k = serverName.toLowerCase() === "secret" || serverName.toLowerCase() === "lisbon";
    return scrapeServer(serverName, req, is4k);
  }

  const activeServers = await getActiveCinejoyServers(req.signal);
  const targetServers = activeServers.length > 0 ? activeServers : [{ name: "Nebula", status: "ok", language: "", description: "", "4k": false }];

  for (const server of targetServers) {
    if (req.signal?.aborted) break;
    const res = await scrapeServer(server.name, req, server["4k"] ?? false);
    if (res.sources.length > 0) return res;
  }

  return { sources: [], subtitles: [] };
}

async function fetchSubtitlesOnly(req: StreamRequest): Promise<SubtitleTrack[]> {
  const res = await scrape(req);
  return res.subtitles;
}

async function getCinejoyChildServers(signal?: AbortSignal) {
  const servers = await getActiveCinejoyServers(signal);
  return servers.map((s) => ({
    id: `cinejoy-${s.name.toLowerCase()}`,
    name: s.name,
    flagUrl: s.language || undefined,
  }));
}

export const cinejoyProvider: Provider = {
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  priority: PROVIDER_PRIORITY,
  fetch: scrape,
  fetchSubtitles: fetchSubtitlesOnly,
  getChildServers: getCinejoyChildServers,
};
