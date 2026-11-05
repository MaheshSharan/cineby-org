export const TIER_1_COUNTRIES = new Set([
  "US", // United States
  "CA", // Canada
  "GB", // United Kingdom
  "AU", // Australia
  "NZ", // New Zealand
  "DE", // Germany
  "NL", // Netherlands
  "BE", // Belgium
  "FR", // France
  "ES", // Spain
  "IT", // Italy
  "CH", // Switzerland
  "AT", // Austria
  "SE", // Sweden
  "NO", // Norway
  "DK", // Denmark
  "FI", // Finland
  "IE", // Ireland
  "LU", // Luxembourg
  "SG", // Singapore
  "JP", // Japan
  "AE", // United Arab Emirates
]);

export function getClientCountry(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  // 1. Check for cookie set by Edge/SSR
  const cookieMatch = document.cookie.match(/(?:^|;\s*)cineby_geo=([A-Za-z]{2})/);
  if (cookieMatch && cookieMatch[1]) {
    return cookieMatch[1].toUpperCase();
  }

  // 2. Check for cached country in localStorage
  try {
    const cached = localStorage.getItem("cineby_country_code");
    if (cached && /^[A-Z]{2}$/.test(cached)) {
      return cached;
    }
  } catch {
    // Ignore localStorage errors
  }

  // 3. Fallback inference from Intl timezone if available
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZone) {
      if (timeZone.startsWith("America/New_York") || timeZone.startsWith("America/Chicago") ||
          timeZone.startsWith("America/Denver") || timeZone.startsWith("America/Los_Angeles")) {
        return "US";
      }
      if (timeZone.startsWith("Europe/London")) return "GB";
      if (timeZone.startsWith("Australia/")) return "AU";
      if (timeZone.startsWith("Europe/Amsterdam")) return "NL";
      if (timeZone.startsWith("Europe/Berlin")) return "DE";
      if (timeZone.startsWith("Asia/Kolkata")) return "IN";
    }
  } catch {
    // Ignore Intl errors
  }

  return null;
}

export function isTier1Country(countryCode?: string | null): boolean {
  const code = countryCode ?? getClientCountry();
  if (!code) {
    // Default to false if unknown to protect site cleanliness and avoid unwanted CPA click pollution
    return false;
  }
  return TIER_1_COUNTRIES.has(code.toUpperCase());
}
