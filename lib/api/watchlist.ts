import type { MediaType } from "@/lib/tmdb";
import type { WatchlistItem } from "@/lib/db/types";
import { ApiError, apiFetch, getJson, sendJson } from "@/lib/api/client";

export interface WatchlistInput {
  mediaType: MediaType;
  mediaId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
}

interface WatchlistCheckResponse {
  inWatchlist: boolean;
}

interface WatchlistListResponse {
  items: WatchlistItem[];
}

async function getOrFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    return await getJson<T>(path);
  } catch (error) {
    if (error instanceof ApiError) return fallback;
    throw error;
  }
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  const data = await getOrFallback<WatchlistListResponse>("/api/watchlist", { items: [] });

  return Array.isArray(data.items) ? data.items : [];
}

export async function checkWatchlist(
  mediaType: MediaType,
  mediaId: number
): Promise<boolean> {
  const data = await getOrFallback<WatchlistCheckResponse>(`/api/watchlist/${mediaType}/${mediaId}`, {
    inWatchlist: false,
  });

  return typeof data.inWatchlist === "boolean" ? data.inWatchlist : false;
}

export async function addToWatchlist(
  item: WatchlistInput
): Promise<boolean> {
  const response = await sendJson("/api/watchlist", "POST", item);

  return response.ok;
}

export async function removeFromWatchlist(
  mediaType: MediaType,
  mediaId: number
): Promise<boolean> {
  const response = await apiFetch(`/api/watchlist/${mediaType}/${mediaId}`, { method: "DELETE" });

  return response.ok;
}

export async function clearAllWatchlist(): Promise<boolean> {
  const response = await apiFetch("/api/watchlist", { method: "DELETE" });

  return response.ok;
}
