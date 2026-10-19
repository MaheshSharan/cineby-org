import { getTmdbDefaultLanguage } from "@/lib/env/public";
import { getTmdbApiKey, getTmdbApiUrl } from "@/lib/env/server";

export interface TmdbConfig {
  apiUrl: string;
  apiKey: string;
  defaultLanguage: string;
}

export function getTmdbConfig(): TmdbConfig {
  return {
    apiUrl: getTmdbApiUrl(),
    apiKey: getTmdbApiKey(),
    defaultLanguage: getTmdbDefaultLanguage(),
  };
}
