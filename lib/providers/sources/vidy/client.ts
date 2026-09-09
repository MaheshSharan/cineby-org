/**
 * Client-Side Vidy Stream Fetcher
 *
 * Runs directly inside the user's browser using the client's residential IP.
 * Bypasses Cloudflare datacenter IP rate limits (HTTP 429) on api.wecollege.net.
 *
 * Same pattern as the Vidking client fetcher — browser fetches seed + ciphertext,
 * POSTs the encrypted payload to /api/stream/resolve for server-side decryption.
 */

export interface VidyClientPayload {
  seed: string;
  ciphertext: string;
  serverId: string;
}

const API_BASE = "https://api.wecollege.net";

const VIDY_SERVERS = [
  { id: "miami",   endpoint: "miami/sources" },
  { id: "seattle", endpoint: "seattle/sources" },
  { id: "denver",  endpoint: "denver/sources" },
  { id: "atlanta", endpoint: "atlanta/sources" },
  { id: "phoenix", endpoint: "phoenix/sources" },
  { id: "portland",endpoint: "portland/sources" },
  { id: "austin",  endpoint: "austin/sources" },
  { id: "dallas",  endpoint: "dallas/sources" },
] as const;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

export async function fetchVidyPayloadFromBrowser(params: {
  tmdbId: number;
  type: "movie" | "tv";
  title?: string;
  year?: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  targetServer?: string;
  signal?: AbortSignal;
}): Promise<VidyClientPayload | null> {
  const { tmdbId, type, title, year, imdbId, season, episode, targetServer, signal } = params;

  try {
    // Step 1: fetch seed from residential IP
    const seedRes = await fetch(`${API_BASE}/seed?mediaId=${tmdbId}`, {
      headers: {
        "User-Agent": BROWSER_UA,
        Referer: "https://www.vidy.st/",
        Origin: "https://www.vidy.st",
      },
      signal,
    });
    if (!seedRes.ok) return null;

    const seedData = (await seedRes.json()) as { seed?: string };
    const seed = seedData?.seed;
    if (!seed || typeof seed !== "string") return null;

    // Step 2: select servers to try
    const serversToTry = targetServer && targetServer !== "default"
      ? VIDY_SERVERS.filter((s) => targetServer === s.id || targetServer === `vidy-${s.id}`)
      : VIDY_SERVERS;

    for (const server of serversToTry) {
      const url = new URL(`${API_BASE}/${server.endpoint}`);
      if (title) url.searchParams.set("title", title);
      url.searchParams.set("mediaType", type);
      if (year) url.searchParams.set("year", year);
      url.searchParams.set("episodeId", String(episode ?? 1));
      url.searchParams.set("seasonId", String(season ?? 1));
      url.searchParams.set("tmdbId", String(tmdbId));
      if (imdbId) url.searchParams.set("imdbId", imdbId);
      url.searchParams.set("enc", "2");
      url.searchParams.set("seed", seed);
      url.searchParams.set("_t", String(Date.now()));

      try {
        const sourcesRes = await fetch(url.toString(), {
          headers: {
            "User-Agent": BROWSER_UA,
            Referer: "https://www.vidy.st/",
            Origin: "https://www.vidy.st",
          },
          signal,
        });
        if (!sourcesRes.ok) continue;

        const ciphertext = await sourcesRes.text();
        // Reject empty, JSON error objects, or HTML challenge pages
        if (!ciphertext || ciphertext.startsWith("{") || ciphertext.startsWith("<")) {
          continue;
        }

        return { seed, ciphertext, serverId: server.id };
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}
