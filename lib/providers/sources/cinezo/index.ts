import type {
  Provider,
  Quality,
  StreamFormat,
  StreamRequest,
  StreamResponse,
  StreamSource,
  SubtitleTrack,
} from "../../types";
import { logError, logger } from "@/lib/logger";

const PROVIDER_ID = "cinezo";
const PROVIDER_NAME = "Cinezo";
const PLAYER_ORIGIN = "https://player.cinezo.live";

interface ChildServerConfig {
  id: string;
  name: string;
  type: "flikhub1" | "flikhub3" | "vidcool";
}

const CHILD_SERVERS: ChildServerConfig[] = [
  { id: "berlin", name: "Berlin", type: "flikhub1" },
  { id: "zendaya", name: "Zendaya", type: "flikhub3" },
  { id: "cinefreak", name: "Sadie", type: "flikhub1" },
  { id: "jennifer", name: "Jennifer", type: "vidcool" },
];

interface CinezoQuality {
  quality?: string;
  codec?: string;
  url?: string;
  type?: string;
}

interface CinezoJsonSource {
  source?: string;
  label?: string;
  url?: string;
  type?: string;
  qualities?: CinezoQuality[];
}

interface CinezoJsonSubtitle {
  label: string;
  file: string;
  type?: string;
  source?: string;
}

interface CinezoJsonResponse {
  source?: CinezoJsonSource;
  subtitles?: CinezoJsonSubtitle[];
}

function parseQuality(q?: string): Quality {
  if (!q) return "1080p";
  const lower = q.toLowerCase();
  if (lower.includes("2160") || lower.includes("4k")) return "2160p";
  if (lower.includes("1440") || lower.includes("2k")) return "1440p";
  if (lower.includes("1080") || lower.includes("fhd") || lower.includes("full hd")) return "1080p";
  if (lower.includes("720") || lower.includes("hd")) return "720p";
  if (lower.includes("480") || lower.includes("sd")) return "480p";
  if (lower.includes("360")) return "360p";
  return "1080p";
}

function parseStreamType(typeStr?: string, url?: string): StreamFormat {
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes(".m3u8") || lower.includes("master.m3u8")) return "hls";
    if (lower.includes(".mpd") || lower.includes("manifest.mpd")) return "dash";
  }
  if (!typeStr) return "hls";
  const lower = typeStr.toLowerCase();
  if (lower === "dash" || lower.includes("mpd")) return "dash";
  if (lower === "mp4") return "mp4";
  return "hls";
}

function buildEndpoint(
  server: ChildServerConfig,
  type: "movie" | "tv",
  tmdbId: number,
  season?: number | null,
  episode?: number | null
): string {
  if (server.type === "vidcool") {
    return type === "tv"
      ? `https://media.vidcool.net/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}.json`
      : `https://media.vidcool.net/movie/${tmdbId}.json`;
  }

  const baseProxy =
    server.type === "flikhub3"
      ? "https://proxy3.flikhub.net"
      : "https://proxy1.flikhub.net";

  return type === "tv"
    ? `${baseProxy}/tv?id=${tmdbId}&season=${season ?? 1}&episode=${episode ?? 1}&mode=json&sources=${server.id}&hevc=1`
    : `${baseProxy}/movie?id=${tmdbId}&mode=json&sources=${server.id}&hevc=1`;
}

function buildRequestHeaders(
  type: "movie" | "tv",
  tmdbId: number,
  season?: number | null,
  episode?: number | null
): Record<string, string> {
  const referer =
    type === "tv"
      ? `${PLAYER_ORIGIN}/embed/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}?autoplay=true`
      : `${PLAYER_ORIGIN}/embed/movie/${tmdbId}?autoplay=true`;

  return {
    Referer: referer,
    Origin: PLAYER_ORIGIN,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
    Accept: "*/*",
  };
}

async function isStreamPlayable(url: string, headers: Record<string, string>, parentSignal?: AbortSignal): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 750);
  const onParentAbort = () => controller.abort();
  if (parentSignal) parentSignal.addEventListener("abort", onParentAbort);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...headers,
        Range: "bytes=0-100",
      },
      signal: controller.signal,
    });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    if (parentSignal) parentSignal.removeEventListener("abort", onParentAbort);
  }
}

async function scrapeServer(
  server: ChildServerConfig,
  req: StreamRequest
): Promise<StreamResponse> {
  const { tmdbId, type, season, episode, signal } = req;
  const endpoint = buildEndpoint(server, type, tmdbId, season, episode);
  const headers = buildRequestHeaders(type, tmdbId, season, episode);

  try {
    const res = await fetch(endpoint, { headers, signal });

    if (!res.ok) {
      logger.warn(`[cinezo:${server.id}] Endpoint returned status=${res.status}`);
      return { sources: [], subtitles: [] };
    }

    const data = (await res.json()) as CinezoJsonResponse;
    const sources: StreamSource[] = [];
    const subtitles: SubtitleTrack[] = [];

    if (Array.isArray(data.subtitles)) {
      data.subtitles.forEach((sub, i) => {
        if (!sub.file || sub.source === "easter-egg" || sub.file.startsWith("data:")) return;
        subtitles.push({
          id: `cinezo-sub-${i}`,
          label: sub.label,
          url: sub.file,
          format: "vtt",
          headers: { Referer: PLAYER_ORIGIN, Origin: PLAYER_ORIGIN },
        });
      });
    }

    const raw = data.source;
    if (raw) {
      const serverLabel = raw.label ?? server.name;
      const commonHeaders = {
        Referer: PLAYER_ORIGIN,
        Origin: PLAYER_ORIGIN,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
      };

      // Check whether Cinezo upstream source is currently playable before offering it
      const probeUrl = raw.url || (Array.isArray(raw.qualities) && raw.qualities[0]?.url) || "";
      if (probeUrl) {
        const playable = await isStreamPlayable(probeUrl, commonHeaders, signal);
        if (!playable) {
          logger.warn(`[cinezo:${server.id}] Stream probe failed or returned non-2xx status`);
          return { sources: [], subtitles: [] };
        }
      }

      // If the API returns multiple qualities, expose all available qualities
      if (Array.isArray(raw.qualities) && raw.qualities.length > 0) {
        for (let idx = 0; idx < raw.qualities.length; idx++) {
          const q = raw.qualities[idx];
          if (!q.url) continue;
          const streamType = parseStreamType(q.type, q.url);
          // Only serve playable HLS streams — HTML5 player cannot play MPEG-DASH without dash.js
          if (streamType === "dash") continue;

          sources.push({
            url: q.url,
            direct: false,
            type: streamType,
            quality: parseQuality(q.quality || raw.label),
            headers: commonHeaders,
            provider: {
              id: `${PROVIDER_ID}-${server.id}`,
              name: `Cinezo - ${serverLabel}${q.quality && q.quality !== "Auto" ? ` (${q.quality})` : ""}`,
            },
          });
        }
      }

      // If no qualities list was provided or qualities list was empty, use primary url
      if (sources.length === 0 && raw.url) {
        const streamType = parseStreamType(raw.type, raw.url);
        // Only serve playable HLS streams — skip MPEG-DASH
        if (streamType !== "dash") {
          sources.push({
            url: raw.url,
            direct: false,
            type: streamType,
            quality: parseQuality(raw.label),
            headers: commonHeaders,
            provider: {
              id: `${PROVIDER_ID}-${server.id}`,
              name: `Cinezo - ${serverLabel}`,
            },
          });
        }
      }
    }

    return { sources, subtitles };
  } catch (error) {
    if (!signal?.aborted) {
      logError(`Provider:cinezo:${server.id}`, error);
    }
    return { sources: [], subtitles: [] };
  }
}

async function scrape(req: StreamRequest): Promise<StreamResponse> {
  if (req.signal?.aborted) return { sources: [], subtitles: [] };

  const targetServerId = req.serverId?.startsWith(`${PROVIDER_ID}-`)
    ? req.serverId.slice(PROVIDER_ID.length + 1).toLowerCase()
    : null;

  const servers = targetServerId
    ? CHILD_SERVERS.filter((s) => s.id === targetServerId)
    : CHILD_SERVERS;

  if (servers.length === 0) return { sources: [], subtitles: [] };

  if (targetServerId) {
    return scrapeServer(servers[0], req);
  }

  // When no specific child server requested, try servers sequentially until one responds with streams
  for (const server of servers) {
    if (req.signal?.aborted) break;
    try {
      const result = await scrapeServer(server, req);
      if (result.sources.length > 0) return result;
    } catch {
      // Try next server
    }
  }

  return { sources: [], subtitles: [] };
}

async function fetchSubtitlesOnly(req: StreamRequest): Promise<SubtitleTrack[]> {
  if (req.signal?.aborted) return [];

  const targetServerId = req.serverId?.startsWith(`${PROVIDER_ID}-`)
    ? req.serverId.slice(PROVIDER_ID.length + 1).toLowerCase()
    : CHILD_SERVERS[0].id;

  const server = CHILD_SERVERS.find((s) => s.id === targetServerId) ?? CHILD_SERVERS[0];
  const res = await scrapeServer(server, req);
  return res.subtitles;
}

export const cinezoProvider: Provider = {
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  priority: 20,
  fetch: scrape,
  fetchSubtitles: fetchSubtitlesOnly,
};
