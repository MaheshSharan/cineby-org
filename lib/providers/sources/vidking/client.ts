/**
 * Client-Side Vidking Stream Fetcher
 *
 * Runs directly inside the user's browser using the client's residential IP.
 * Bypasses Cloudflare datacenter IP rate limits (HTTP 429).
 */

export interface ClientEncryptedPayload {
  seed: string;
  ciphertext: string;
  serverId: string;
}

const VIDKING_SERVERS = [
  { id: "yoru", name: "Vidking - Yoru", endpoint: "cdn/sources-with-title" },
  { id: "breach", name: "Vidking - Breach", endpoint: "m4uhd/sources-with-title" },
  { id: "cypher", name: "Vidking - Cypher", endpoint: "downloader2/sources-with-title" },
  { id: "neon", name: "Vidking - Neon", endpoint: "vsrc/sources-with-title" },
] as const;


export async function fetchVidkingPayloadFromBrowser(params: {
  tmdbId: number;
  type: "movie" | "tv";
  title?: string;
  year?: string;
  imdbId?: string;
  season?: number;
  episode?: number;
  targetServer?: string;
  signal?: AbortSignal;
}): Promise<ClientEncryptedPayload | null> {
  const { tmdbId, type, title, year, imdbId, season, episode, targetServer, signal } = params;

  try {
    // 1. Fetch fresh seed from user's residential IP
    const seedRes = await fetch(
      `https://api.speedracelight.com/seed?mediaId=${tmdbId}`,
      { signal }
    );
    if (!seedRes.ok) return null;

    const seedData = (await seedRes.json()) as { seed?: string };
    const seed = seedData?.seed;
    if (!seed || typeof seed !== "string") return null;

    // 2. Select servers to try (prioritizing yoru, or user's requested server)
    const serversToTry = targetServer && targetServer !== "default"
      ? VIDKING_SERVERS.filter((s) => targetServer === s.id || targetServer === `vidking-${s.id}`)
      : VIDKING_SERVERS;

    for (const server of serversToTry) {
      // Query sources-with-title immediately within the 30-second TTL window
      const url = new URL(`https://api.speedracelight.com/${server.endpoint}`);
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
        const sourcesRes = await fetch(url.toString(), { signal });
        if (!sourcesRes.ok) continue;

        const ciphertext = await sourcesRes.text();
        if (!ciphertext || ciphertext.startsWith("{") || ciphertext.startsWith("<")) {
          continue;
        }

        return {
          seed,
          ciphertext,
          serverId: server.id,
        };
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}
