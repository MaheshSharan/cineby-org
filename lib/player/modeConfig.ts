import { parseEnum, parseFlag, parseList, parsePositiveInteger, requireValue } from "@/lib/env/read";
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

export const PLAYER_MODES = ["native", "hybrid", "embed"] as const;

export function getPlayerModeConfig(): PlayerModeConfig {
  const rawMode = (readServerEnv("PLAYER_MODE") || "native").trim().toLowerCase();
  const mode = parseEnum("PLAYER_MODE", rawMode, PLAYER_MODES);
  const enableEmbedFlag = parseFlag("ENABLE_EMBED_PLAYERS", readServerEnv("ENABLE_EMBED_PLAYERS"));

  const nativeEnabled = mode === "native" || mode === "hybrid";
  // embed is enabled if mode is hybrid or embed AND ENABLE_EMBED_PLAYERS is true
  const embedEnabled = (mode === "hybrid" || mode === "embed") && enableEmbedFlag;

  const defaultServer = readServerEnv("EMBED_DEFAULT_SERVER")?.trim() || (nativeEnabled ? "native" : "vixsrc");
  const loadTimeoutMs = parsePositiveInteger(
    "EMBED_LOAD_TIMEOUT_MS",
    readServerEnv("EMBED_LOAD_TIMEOUT_MS") || "12000"
  );

  const rawPriority = readServerEnv("EMBED_SERVER_PRIORITY") || "";
  const priorityList = rawPriority ? parseList("EMBED_SERVER_PRIORITY", rawPriority) : ["vixsrc", "vidy"];

  const servers: PlayerServerOption[] = [];

  if (nativeEnabled) {
    servers.push({
      id: "native",
      name: "Default (Native)",
      type: "native",
      startAtSupported: true,
      eventsSupported: true,
    });
  }

  if (embedEnabled) {
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
  }

  return {
    mode,
    nativeEnabled,
    embedEnabled,
    defaultServer,
    loadTimeoutMs,
    servers,
  };
}
