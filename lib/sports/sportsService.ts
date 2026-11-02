import type { FlattenedSportsData, SportCategoryGroup, SportMatch, SportsApiResponse } from "./types";

const PPV_STREAMS_ENDPOINTS = [
  "https://api.ppv.st/api/streams",
  "https://api.ppv.rw/api/streams",
  "https://api.ppv.ms/api/streams",
  "https://api.ppv.bi/api/streams",
  "https://api.ppv.ug/api/streams",
];

const MAJOR_LEAGUES_KEYWORDS = [
  "champions league",
  "premier league",
  "la liga",
  "serie a",
  "bundesliga",
  "ligue 1",
  "world cup",
  "euro",
  "copa",
  "nba",
  "nfl",
  "ufc",
  "boxing",
  "cricket",
  "ipl",
  "f1",
  "formula 1",
  "wwe",
];

const FAMOUS_TEAMS_KEYWORDS = [
  "real madrid",
  "barcelona",
  "manchester",
  "liverpool",
  "arsenal",
  "chelsea",
  "bayern",
  "juventus",
  "milan",
  "inter",
  "psg",
  "paris saint-germain",
  "tottenham",
  "newcastle",
  "atletico",
  "dortmund",
  "lakers",
  "warriors",
  "celtics",
  "bulls",
  "heat",
  "knicks",
  "chiefs",
  "cowboys",
  "patriots",
  "eagles",
  "49ers",
  "packers",
  "india",
  "pakistan",
  "australia",
  "england",
];

export function isFamousMatch(match: SportMatch): boolean {
  const text = `${match.name} ${match.tag}`.toLowerCase();
  for (const team of FAMOUS_TEAMS_KEYWORDS) {
    if (text.includes(team)) return true;
  }
  for (const league of ["champions league", "premier league", "la liga", "nba", "nfl", "ufc", "ipl"]) {
    if (text.includes(league)) return true;
  }
  return false;
}

export function isMatchLive(match: SportMatch, nowSec: number = Math.floor(Date.now() / 1000)): boolean {
  if (match.always_live === 1 || match.always_live === true) {
    return true;
  }
  return match.starts_at <= nowSec && match.ends_at >= nowSec;
}

export function isMatchUpcoming(match: SportMatch, nowSec: number = Math.floor(Date.now() / 1000)): boolean {
  if (match.always_live === 1 || match.always_live === true) {
    return false;
  }
  return match.starts_at > nowSec;
}

export function calculateMatchScore(match: SportMatch, nowSec: number = Math.floor(Date.now() / 1000)): number {
  let score = 0;
  const isLive = isMatchLive(match, nowSec);
  if (isLive) {
    score += 10000;
  }

  const nameAndTag = `${match.name} ${match.tag} ${match.category_name}`.toLowerCase();
  for (const keyword of MAJOR_LEAGUES_KEYWORDS) {
    if (nameAndTag.includes(keyword)) {
      score += 2000;
      break;
    }
  }

  // Bonus for non-24/7 specific real matches over static 24/7 channels
  if (match.tag !== "24/7 channel" && match.category_name !== "24/7 Streams") {
    score += 500;
  }

  const viewers = typeof match.viewers === "string" ? Number.parseInt(match.viewers, 10) : Number(match.viewers || 0);
  if (!Number.isNaN(viewers) && viewers > 0) {
    score += Math.min(viewers * 10, 1500);
  }

  // If upcoming, prioritize soonest matches
  if (!isLive && match.starts_at > nowSec) {
    const diffHours = (match.starts_at - nowSec) / 3600;
    if (diffHours <= 6) {
      score += 300;
    } else if (diffHours <= 24) {
      score += 100;
    }
  }

  return score;
}

export function processStreamsPayload(data: SportsApiResponse): FlattenedSportsData {
  const categoryGroups: SportCategoryGroup[] = Array.isArray(data?.streams) ? data.streams : [];
  const nowSec = Math.floor(Date.now() / 1000);
  const allMatches: SportMatch[] = [];
  const categoriesSet = new Set<string>();

  for (const group of categoryGroups) {
    if (group.category) {
      categoriesSet.add(group.category);
    }
    if (Array.isArray(group.streams)) {
      for (const s of group.streams) {
        if (!s.category_name && group.category) {
          s.category_name = group.category;
        }
        allMatches.push(s);
      }
    }
  }

  // Deduplicate by uri_name or id
  const seen = new Set<string>();
  const uniqueMatches = allMatches.filter((m) => {
    const key = m.uri_name || String(m.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by priority score
  uniqueMatches.sort((a, b) => calculateMatchScore(b, nowSec) - calculateMatchScore(a, nowSec));

  const liveNow = uniqueMatches.filter((m) => isMatchLive(m, nowSec));
  const upcoming = uniqueMatches.filter((m) => isMatchUpcoming(m, nowSec)).sort((a, b) => a.starts_at - b.starts_at);

  return {
    all: uniqueMatches,
    liveNow,
    upcoming,
    categories: Array.from(categoriesSet),
  };
}

export async function fetchSportsData(): Promise<FlattenedSportsData> {
  let lastError: Error | null = null;
  let data: SportsApiResponse | null = null;

  for (const endpoint of PPV_STREAMS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${endpoint}`);
        continue;
      }

      const json = (await res.json()) as SportsApiResponse;
      if (json && Array.isArray(json.streams) && json.streams.length > 0) {
        data = json;
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!data) {
    throw lastError || new Error("Failed to fetch sports streams from all mirrors");
  }

  return processStreamsPayload(data);
}

export function findMatchBySlugOrId(matches: SportMatch[], slugOrId: string): SportMatch | undefined {
  if (!slugOrId) return undefined;
  const normalized = decodeURIComponent(slugOrId).trim().toLowerCase();
  
  // Try exact uri_name match first
  const byUri = matches.find((m) => m.uri_name.toLowerCase() === normalized);
  if (byUri) return byUri;

  // Try numeric id
  const byId = matches.find((m) => String(m.id) === normalized);
  if (byId) return byId;

  // Try matching last segment of uri_name
  return matches.find((m) => {
    const segments = m.uri_name.toLowerCase().split("/");
    return segments[segments.length - 1] === normalized;
  });
}
