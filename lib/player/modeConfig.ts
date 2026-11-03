import { parseList, parsePositiveInteger } from "@/lib/env/read";
import { readServerEnv } from "@/lib/env/server";
import { listAvailableEmbedProviders } from "@/lib/embeds/registry";
import type { PlayerMode } from "@/lib/embeds/types";

export interface PlayerServerOption {
  id: string;
  name: string;
  type: "native" | "embed";
  startAtSupported: boolean;
  eventsSupported: boolean;
}

export interface PlayerModeConfig {
  mode: PlayerMode;
  nativeEnabled: boolean;
  embedEnabled: boolean;
  defaultServer: string;
  loadTimeoutMs: number;
  servers: PlayerServerOption[];
}

export const PLAYER_MODES = ["embed"] as const;

export function getPlayerModeConfig(): PlayerModeConfig {
  const defaultServer = readServerEnv("EMBED_DEFAULT_SERVER")?.trim() || "vixsrc";
  const loadTimeoutMs = parsePositiveInteger(
    "EMBED_LOAD_TIMEOUT_MS",
    readServerEnv("EMBED_LOAD_TIMEOUT_MS") || "8000"
  );

  const rawPriority = readServerEnv("EMBED_SERVER_PRIORITY") || "";
  const priorityList = rawPriority
    ? parseList("EMBED_SERVER_PRIORITY", rawPriority)
    : ["vixsrc", "vidy", "vidnest"];

  const servers: PlayerServerOption[] = [];
  const embedProviders = listAvailableEmbedProviders(priorityList);
  for (const ep of embedProviders) {
    servers.push({
      id: ep.id,
      name: ep.name,
      type: "embed",
      startAtSupported: ep.capabilities.startAt,
      eventsSupported: ep.capabilities.events,
    });
  }

  return {
    mode: "embed",
    nativeEnabled: false,
    embedEnabled: true,
    defaultServer,
    loadTimeoutMs,
    servers,
  };
}
