/**
 * Christmas season configuration and date helpers.
 *
 * Controls whether Christmas UI (banner, snow, custom browse pills) is active.
 *
 * Control Mechanisms:
 * 1. Environment Variable:
 *    - NEXT_PUBLIC_CHRISTMAS_EVENT="false" -> forces holiday mode OFF immediately
 *    - NEXT_PUBLIC_CHRISTMAS_EVENT="true"  -> forces holiday mode ON
 * 2. Automatic Date Window:
 *    - Starts: November 15
 *    - Peaks: December 24 (Christmas Eve) & December 25 (Christmas Day)
 *    - Boxing Day & Holiday Week: December 26 - January 2 ("Happy Holidays!")
 *    - Ends: January 3 (auto-hides completely)
 */

export const CHRISTMAS_KEYWORD_ID = "207317";

/** Only known keyword ids are accepted: any other value would create a new cache entry per request. */
export function parseBrowseKeywords(value: unknown): string | undefined {
  return value === CHRISTMAS_KEYWORD_ID ? value : undefined;
}

export interface ChristmasStatus {
  isActive: boolean;
  pillText: string;
  isEve: boolean;
  isChristmasDay: boolean;
  daysRemaining: number;
}

export function getChristmasStatus(now: Date = new Date()): ChristmasStatus {
  const envOverride = process.env.NEXT_PUBLIC_CHRISTMAS_EVENT;
  if (envOverride === "false") {
    return {
      isActive: false,
      pillText: "",
      isEve: false,
      isChristmasDay: false,
      daysRemaining: 0,
    };
  }

  // UTC, so the server render and every visitor's browser agree on the date and hydration matches.
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 = Jan ... 10 = Nov, 11 = Dec
  const day = now.getUTCDate();

  // Active season: Nov 15 through Jan 2 (or forced via env)
  const isSeason =
    envOverride === "true" ||
    (month === 10 && day >= 15) ||
    month === 11 ||
    (month === 0 && day <= 2);

  if (!isSeason) {
    return {
      isActive: false,
      pillText: "",
      isEve: false,
      isChristmasDay: false,
      daysRemaining: 0,
    };
  }

  // Target Christmas date
  const xmasYear = month === 0 ? year - 1 : year;
  const xmas = new Date(Date.UTC(xmasYear, 11, 25));

  const diffTime = xmas.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let pillText = "";
  let isEve = false;
  let isChristmasDay = false;

  if (month === 11 && day === 24) {
    pillText = "Christmas Eve! 🎄";
    isEve = true;
  } else if (month === 11 && day === 25) {
    pillText = "Merry Christmas! 🎅";
    isChristmasDay = true;
  } else if (diffDays > 0) {
    pillText = `${diffDays} days to Christmas`;
  } else {
    // Dec 26 through Jan 2
    pillText = "Happy Holidays! ✨";
  }

  return {
    isActive: true,
    pillText,
    isEve,
    isChristmasDay,
    daysRemaining: Math.max(0, diffDays),
  };
}
