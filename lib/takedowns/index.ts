import type { Redirect } from "next";

import type { MediaType } from "@/lib/tmdb";
import { TAKEDOWN_LIST } from "./takedownList";

const takenDownKeys = new Set(TAKEDOWN_LIST.map((entry) => toKey(entry.mediaType, entry.id)));

function toKey(mediaType: MediaType, id: number): string {
  return `${mediaType}:${id}`;
}

export function isTakenDown(mediaType: MediaType, id: string | number): boolean {
  return takenDownKeys.has(toKey(mediaType, Number(id)));
}

export function withoutTakenDown<T extends { id: number; mediaType: MediaType }>(items: T[]): T[] {
  return items.filter((item) => !isTakenDown(item.mediaType, item.id));
}

// Temporary on purpose: a permanent redirect would tell browsers to cache the home page for these URLs forever.
export const TAKEDOWN_REDIRECT: Redirect = { destination: "/", permanent: false };
