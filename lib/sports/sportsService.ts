import type { FlattenedSportsData, SportCategoryGroup, SportMatch, SportsApiResponse } from "./types";

const PPV_STREAMS_ENDPOINTS = [
  "https://api.ppv.st/api/streams",
  "https://api.ppv.rw/api/streams",
  "https://api.ppv.ms/api/streams",
  "https://api.ppv.bi/api/streams",
  "https://api.ppv.ug/api/streams",
];

export function getActiveEndpoints(): string[] {
  return PPV_STREAMS_ENDPOINTS;
}

/**
 * Competition Tiers:
 * Tier 1 (Elite: +3500): Champions League, Premier League, World Cup, NBA, F1, UFC, IPL Cricket, NFL
 * Tier 2 (High: +2200): La Liga, Serie A, Bundesliga, Europa League, EuroLeague
 * Tier 3 (Medium: +1200): Ligue 1, Eredivisie, FA Cup, Copa del Rey, DFB Pokal, MLS, Copa Libertadores
 * Tier 4 (Standard: +400): Other regional cups/leagues
 */
const TIER_1_COMPETITIONS = [
  "champions league",
  "premier league",
  "world cup",
  "fifa world cup",
  "uefa champions league",
  "nba",
  "formula 1",
  "formula one",
  "f1",
  "ufc",
  "ipl",
  "indian premier league",
  "nfl",
];

const TIER_2_COMPETITIONS = [
  "la liga",
  "laliga",
  "serie a",
  "bundesliga",
  "europa league",
  "uefa europa league",
  "euroleague",
];

const TIER_3_COMPETITIONS = [
  "ligue 1",
  "eredivisie",
  "fa cup",
  "copa del rey",
  "dfb-pokal",
  "dfb pokal",
  "mls",
  "major league soccer",
  "copa libertadores",
  "conference league",
];

/**
 * Team & Participant Popularity Weights:
 * Tier 1 (Global Giants: +2500)
 * Tier 2 (Major Clashes: +1400)
 * Tier 3 (Mid-tier: +600)
 */
const TIER_1_TEAMS = [
  "real madrid",
  "barcelona",
  "manchester united",
  "man united",
  "manchester city",
  "man city",
  "liverpool",
  "arsenal",
  "chelsea",
  "bayern",
  "bayern munich",
  "psg",
  "paris saint-germain",
  "lakers",
  "los angeles lakers",
  "warriors",
  "golden state warriors",
  "celtics",
  "boston celtics",
  "ferrari",
  "red bull",
  "red bull racing",
  "india",
  "australia",
];

const TIER_2_TEAMS = [
  "tottenham",
  "tottenham hotspur",
  "newcastle",
  "newcastle united",
  "aston villa",
  "atletico",
  "atletico madrid",
  "juventus",
  "inter",
  "inter milan",
  "milan",
  "ac milan",
  "dortmund",
  "borussia dortmund",
  "heat",
  "miami heat",
  "bucks",
  "milwaukee bucks",
  "knicks",
  "mclaren",
  "mercedes",
  "pakistan",
  "england",
  "chiefs",
  "49ers",
  "cowboys",
];

const TIER_3_TEAMS = [
  "west ham",
  "everton",
  "roma",
  "as roma",
  "napoli",
  "lazio",
  "bayer leverkusen",
  "leverkusen",
  "rb leipzig",
  "leipzig",
  "monaco",
  "lyon",
  "marseille",
  "sevilla",
  "athletic club",
  "valencia",
  "real betis",
  "bulls",
  "76ers",
];

export function getCompetitionTierScore(text: string): number {
  const lower = text.toLowerCase();
  for (const comp of TIER_1_COMPETITIONS) {
    if (lower.includes(comp)) return 3500;
  }
  for (const comp of TIER_2_COMPETITIONS) {
    if (lower.includes(comp)) return 2200;
  }
  for (const comp of TIER_3_COMPETITIONS) {
    if (lower.includes(comp)) return 1200;
  }
  return 400;
}

export function getTeamPopularityScore(teamName: string): number {
  const lower = teamName.toLowerCase().trim();
  if (!lower) return 150;
  for (const t of TIER_1_TEAMS) {
    if (lower.includes(t)) return 2500;
  }
  for (const t of TIER_2_TEAMS) {
    if (lower.includes(t)) return 1400;
  }
  for (const t of TIER_3_TEAMS) {
    if (lower.includes(t)) return 600;
  }
  return 150;
}

/**
 * Extracts participant names from match string e.g. "Arsenal vs Chelsea" or "Lakers at Celtics"
 */
export function extractParticipants(matchName: string): [string, string] {
  const delimiters = [" vs ", " v ", " - ", " at ", " @ "];
  for (const d of delimiters) {
    if (matchName.includes(d)) {
      const parts = matchName.split(d);
      if (parts.length >= 2) {
        return [parts[0].trim(), parts[1].trim()];
      }
    }
  }
  return [matchName.trim(), ""];
}

export function isFamousMatch(match: SportMatch): boolean {
  const text = `${match.name} ${match.tag}`.toLowerCase();
  for (const team of TIER_1_TEAMS) {
    if (text.includes(team)) return true;
  }
  for (const comp of TIER_1_COMPETITIONS) {
    if (text.includes(comp)) return true;
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

/**
 * Dynamic Match Ranking System:
 * Score = Base + EventPopularity + Traffic + Urgency
 * EventPopularity = max(P_t1, P_t2) * 0.6 + min(P_t1, P_t2) * 0.4 + P_competition
 */
export function calculateMatchScore(match: SportMatch, nowSec: number = Math.floor(Date.now() / 1000)): number {
  let score = 0;
  const isLive = isMatchLive(match, nowSec);
  if (isLive) {
    score += 10000;
  }

  // 1. Competition tier score (Premier League +3500 vs Serie A +2200 vs Ligue 1 +1200)
  const fullMeta = `${match.name} ${match.tag} ${match.category_name}`;
  const compScore = getCompetitionTierScore(fullMeta);

  // 2. Team popularity score
  const [t1, t2] = extractParticipants(match.name);
  const p1 = getTeamPopularityScore(t1);
  const p2 = t2 ? getTeamPopularityScore(t2) : 150;
  const maxTeam = Math.max(p1, p2);
  const minTeam = Math.min(p1, p2);
  const eventPopularity = Math.round(maxTeam * 0.6 + minTeam * 0.4) + compScore;

  score += eventPopularity;

  // Bonus for dedicated events over continuous 24/7 channels
  if (match.tag !== "24/7 channel" && match.category_name !== "24/7 Streams") {
    score += 500;
  }

  // 3. Traffic / Viewers
  const viewers = typeof match.viewers === "string" ? Number.parseInt(match.viewers, 10) : Number(match.viewers || 0);
  if (!Number.isNaN(viewers) && viewers > 0) {
    score += Math.min(viewers * 10, 1500);
  }

  // 4. Upcoming kickoff urgency
  if (!isLive && match.starts_at > nowSec) {
    const diffHours = (match.starts_at - nowSec) / 3600;
    if (diffHours <= 2) {
      score += 400;
    } else if (diffHours <= 6) {
      score += 200;
    } else if (diffHours <= 24) {
      score += 50;
    }
  }

  return score;
}

/**
 * Diversifies top matches so a single league/competition does not monopolize all initial slots.
 */
export function getHomepageDiversifiedMatches(matches: SportMatch[], limit: number = 15): SportMatch[] {
  if (matches.length <= 1) return matches;

  const result: SportMatch[] = [];
  const compCounts = new Map<string, number>();
  const deferred: SportMatch[] = [];

  for (const m of matches) {
    const compKey = (m.tag || m.category_name || "other").toLowerCase();
    const count = compCounts.get(compKey) || 0;

    // In top 10 positions, allow max 4 matches from the same competition
    if (result.length < 10 && count >= 4) {
      deferred.push(m);
    } else {
      result.push(m);
      compCounts.set(compKey, count + 1);
      if (result.length >= limit) break;
    }
  }

  // Fill remainder from deferred if under limit
  while (result.length < limit && deferred.length > 0) {
    result.push(deferred.shift()!);
  }

  return result;
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

  // Sort by dynamic match score
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

  const endpoints = await getActiveEndpoints();

  for (const endpoint of endpoints) {
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
