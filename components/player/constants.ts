import type { PlaybackRate, QualityLabel, ServerGroup, ServerOption } from "./types";

export const HISTORY_SAVE_INTERVAL_MS = 30_000;

export const AUTOHIDE_CONTROLS_MS = 3000;

export const UNLOCK_BUTTON_VISIBLE_MS = 3000;

export const MIN_INTRO_START_TIME_SEC = 5;
export const MIN_REMAINING_INTRO_TIME_SEC = 3;

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

export const SERVER_GROUPS: ServerGroup[] = [
  {
    id: "vidy",
    name: "Vidy",
    children: [
      { id: "vidy-miami", name: "Miami", flagUrl: getFlagUrl("us") },
      { id: "vidy-boise", name: "Boise", flagUrl: getFlagUrl("us") },
      { id: "vidy-atlanta", name: "Atlanta", flagUrl: getFlagUrl("us") },
      { id: "vidy-seattle", name: "Seattle", flagUrl: getFlagUrl("us") },
      { id: "vidy-denver", name: "Denver", flagUrl: getFlagUrl("us") },
      { id: "vidy-phoenix", name: "Phoenix", flagUrl: getFlagUrl("us") },
      { id: "vidy-portland", name: "Portland", flagUrl: getFlagUrl("us") },
      { id: "vidy-austin", name: "Austin", flagUrl: getFlagUrl("us") },
      { id: "vidy-dallas", name: "Dallas", flagUrl: getFlagUrl("us") },
      { id: "vidy-tampa", name: "Tampa", flagUrl: getFlagUrl("us") },
      { id: "vidy-orlando", name: "Orlando", flagUrl: getFlagUrl("us") },
      { id: "vidy-munich", name: "Munich", flagUrl: getFlagUrl("de") },
      { id: "vidy-berlin", name: "Berlin", flagUrl: getFlagUrl("de") },
      { id: "vidy-paris", name: "Paris", flagUrl: getFlagUrl("fr") },
      { id: "vidy-delhi", name: "Delhi", flagUrl: getFlagUrl("in") },
      { id: "vidy-cancun", name: "Cancun", flagUrl: getFlagUrl("mx") },
    ],
  },
  {
    id: "cinezo",
    name: "Cinezo",
    flagUrl: getFlagUrl("us"),
    children: [
      { id: "cinezo-berlin", name: "Berlin", flagUrl: getFlagUrl("de") },
      { id: "cinezo-zendaya", name: "Zendaya", flagUrl: getFlagUrl("us") },
      { id: "cinezo-cinefreak", name: "Sadie", flagUrl: getFlagUrl("us") },
      { id: "cinezo-jennifer", name: "Jennifer", flagUrl: getFlagUrl("us") },
    ],
  },
  {
    id: "vixsrc",
    name: "Vixsrc",
    flagUrl: getFlagUrl("us"),
    children: [],
  },
];

export const SERVERS: ServerOption[] = [
  { id: "default", name: "Auto", kind: "default" },
  ...SERVER_GROUPS.flatMap((g) =>
    g.children.length > 0
      ? g.children.map((c) => ({
          id: c.id,
          name: c.name,
          kind: "default" as const,
          flagUrl: c.flagUrl,
        }))
      : [
          {
            id: g.id,
            name: g.name,
            kind: "default" as const,
            flagUrl: getFlagUrl("us"),
          },
        ]
  ),
];

