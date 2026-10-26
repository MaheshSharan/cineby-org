// Video ads stay off where a consent banner is legally required until the site has one.
const CONSENT_REQUIRED_COUNTRIES: ReadonlySet<string> = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA, UK, Switzerland
  "IS", "LI", "NO", "GB", "CH",
  // Cloudflare: unknown location and Tor. The region cannot be verified.
  "XX", "T1",
]);

/** `countryCode` is Cloudflare's CF-IPCountry. It is absent in local development, where ads are allowed. */
export function isAdRestrictedCountry(countryCode: string | undefined): boolean {
  if (!countryCode) {
    return false;
  }

  return CONSENT_REQUIRED_COUNTRIES.has(countryCode.trim().toUpperCase());
}
