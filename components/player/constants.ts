import type { PlaybackRate, QualityLabel, ServerOption } from "./types";

export const HISTORY_SAVE_INTERVAL_MS = 30_000;

export const HISTORY_SAVE_THRESHOLD_S = 15;

export const DEFAULT_VOLUME = 0.8;

export const REWIND_MS = 10000;

export const FORWARD_MS = 10000;

export const AUTOHIDE_CONTROLS_MS = 3000;

export const SHOW_CONTROLS_TRANSITION_MS = 300;

export const QUALITIES: QualityLabel[] = ["2160p", "1080p", "720p", "480p"];

export const QUALITY_BADGES: Partial<Record<QualityLabel, string>> = {
  "1080p": "Full HD",
  "720p": "HD",
};

export const PLAYBACK_RATES: PlaybackRate[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const FALLBACK_FLAG_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 16' width='24' height='16'%3E%3Crect width='24' height='16' fill='%23374151' rx='2'/%3E%3Cpath d='M4 3h2v10H4zm4 0h12v6H8z' fill='%239CA3AF'/%3E%3C/svg%3E";

const CODE_MAP: Record<string, string> = {
  en: "US",
  us: "US",
  de: "DE",
  fr: "FR",
  hi: "IN",
  in: "IN",
  es: "MX",
  mx: "MX",
  ja: "JP",
  jp: "JP",
  ko: "KR",
  kr: "KR",
  it: "IT",
  pt: "BR",
  br: "BR",
  ru: "RU",
  zh: "CN",
  cn: "CN",
  ar: "SA",
  sa: "SA",
  tr: "TR",
  nl: "NL",
  pl: "PL",
  sv: "SE",
  se: "SE",
};

export function getFlagUrl(codeOrUrl?: string | null): string {
  if (!codeOrUrl) return FALLBACK_FLAG_URL;

  if (
    codeOrUrl.startsWith("http://") ||
    codeOrUrl.startsWith("https://") ||
    codeOrUrl.startsWith("data:")
  ) {
    return codeOrUrl;
  }

  const clean = codeOrUrl
    .replace(/^\/flags\//, "")
    .replace(/\.(svg|png)$/, "")
    .toLowerCase()
    .trim();

  const countryCode = (CODE_MAP[clean] || clean).toUpperCase();
  if (/^[A-Z]{2}$/.test(countryCode)) {
    return `https://flagsapi.com/${countryCode}/flat/24.png`;
  }

  return FALLBACK_FLAG_URL;
}

const preloadedUrls = new Set<string>();

export function preloadFlags(codesOrUrls: string[]): void {
  if (typeof window === "undefined") return;

  for (const item of codesOrUrls) {
    const url = getFlagUrl(item);
    if (!url || preloadedUrls.has(url) || url.startsWith("data:")) continue;

    preloadedUrls.add(url);
    const img = new Image();
    img.src = url;
  }
}

export const SERVERS: ServerOption[] = [
  { id: "default", name: "Auto", description: "Best available source", kind: "default" },
  { id: "vidy-miami", name: "Miami", description: "Original audio · Fast HLS / 4K", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-boise", name: "Boise", description: "Original audio · High Bitrate HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-atlanta", name: "Atlanta", description: "Original audio · Alternate HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-seattle", name: "Seattle", description: "Original audio · Fast HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-denver", name: "Denver", description: "Original audio · DASH / HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-phoenix", name: "Phoenix", description: "Original audio · Alternate HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-portland", name: "Portland", description: "Original audio · Alternate HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-austin", name: "Austin", description: "Original audio · English stream", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-dallas", name: "Dallas", description: "Original audio · Alternate HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-tampa", name: "Tampa", description: "Original audio · Fast HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-orlando", name: "Orlando", description: "Original audio · Fast HLS", kind: "default", flagUrl: getFlagUrl("us") },
  { id: "vidy-munich", name: "Munich", description: "German dubbed audio", kind: "default", flagUrl: getFlagUrl("de") },
  { id: "vidy-berlin", name: "Berlin", description: "German dubbed audio", kind: "default", flagUrl: getFlagUrl("de") },
  { id: "vidy-paris", name: "Paris", description: "French dubbed audio", kind: "default", flagUrl: getFlagUrl("fr") },
  { id: "vidy-delhi", name: "Delhi", description: "Hindi dubbed audio", kind: "default", flagUrl: getFlagUrl("in") },
  { id: "vidy-cancun", name: "Cancun", description: "Spanish dubbed audio", kind: "default", flagUrl: getFlagUrl("mx") },
];

