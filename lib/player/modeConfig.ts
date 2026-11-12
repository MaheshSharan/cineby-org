import { parseList, parsePositiveInteger } from "@/lib/env/read";
import { readServerEnv } from "@/lib/env/server";
import { listAvailableEmbedProviders } from "@/lib/embeds/registry";

export interface PlayerServerOption {
  id: string;
  name: string;
  type: "embed";
  startAtSupported: boolean;
  eventsSupported: boolean;
}

export interface PlayerModeConfig {
  defaultServer: string;
  loadTimeoutMs: number;
  servers: PlayerServerOption[];
}

export function getPlayerModeConfig(): PlayerModeConfig {
  const defaultServer = readServerEnv("EMBED_DEFAULT_SERVER")?.trim() || "vidrift";
  const loadTimeoutMs = parsePositiveInteger(
    "EMBED_LOAD_TIMEOUT_MS",
    readServerEnv("EMBED_LOAD_TIMEOUT_MS") || "8000"
  );

  const rawPriority = readServerEnv("EMBED_SERVER_PRIORITY") || "";
  const priorityList = rawPriority
    ? parseList("EMBED_SERVER_PRIORITY", rawPriority)
    : ["vidy", "framextv", "vidrift", "vidnest", "vixsrc"];

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
    defaultServer,
    loadTimeoutMs,
    servers,
  };
}
