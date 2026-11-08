import type { EmbedProvider } from "./types";
import { vixsrcEmbed } from "./sites/vixsrc";
import { vidyEmbed } from "./sites/vidy";
import { vidnestEmbed } from "./sites/vidnest";
import { vidriftEmbed } from "./sites/vidrift";
import { framextvEmbed } from "./sites/framextv";

export const ALL_EMBED_PROVIDERS: Record<string, EmbedProvider> = {
  vidrift: vidriftEmbed,
  framextv: framextvEmbed,
  vixsrc: vixsrcEmbed,
  vidy: vidyEmbed,
  vidnest: vidnestEmbed,
};

export function getEmbedProvider(id: string): EmbedProvider | undefined {
  return ALL_EMBED_PROVIDERS[id.toLowerCase()];
}

export function listAvailableEmbedProviders(priorityList: string[]): EmbedProvider[] {
  const result: EmbedProvider[] = [];
  for (const id of priorityList) {
    const p = getEmbedProvider(id);
    if (p && !result.some((existing) => existing.id === p.id)) {
      result.push(p);
    }
  }
  return result;
}
