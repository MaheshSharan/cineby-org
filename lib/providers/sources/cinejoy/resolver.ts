import { createHandshake } from "./wasm";
import type { WingDecryptedResponse, WingStreamItem } from "./types";
import { logger } from "@/lib/logger";

const GATEWAY_URL = "https://api.wing.st/g";
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

/**
 * Resolves streams for a given Cinejoy server and TMDB media request
 * using the WebAssembly challenge + AES-GCM gateway decryption.
 */
export async function resolveWingStream(
  serverName: string,
  mediaType: "movie" | "tv",
  tmdbId: string | number,
  season?: number | null,
  episode?: number | null,
  signal?: AbortSignal
): Promise<WingStreamItem[]> {
  const path = `/${serverName}/${mediaType}`;
  const payload: Record<string, string> = { tmdb: String(tmdbId) };
  if (mediaType === "tv" && season != null && episode != null) {
    payload.season = String(season);
    payload.episode = String(episode);
  }

  const { body, responseKey, additionalData } = await createHandshake(path, payload);

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: Buffer.from(body),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Cinejoy gateway returned HTTP ${res.status}`);
  }

  const resBuffer = new Uint8Array(await res.arrayBuffer());
  if (resBuffer.length < IV_LENGTH + 16) {
    throw new Error("Cinejoy gateway returned invalid response length");
  }

  const iv = resBuffer.slice(0, IV_LENGTH);
  const ciphertext = resBuffer.slice(IV_LENGTH);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    Buffer.from(responseKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Buffer.from(iv),
      additionalData: Buffer.from(additionalData),
      tagLength: TAG_LENGTH,
    },
    cryptoKey,
    Buffer.from(ciphertext)
  );

  const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as WingDecryptedResponse;
  const streams = parsed.data?.stream;
  if (!Array.isArray(streams) || streams.length === 0) {
    logger.debug(`[cinejoy:${serverName}] Gateway returned no streams for ${path}`);
    return [];
  }

  return streams;
}
