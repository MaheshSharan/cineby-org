/**
 * Embed Player Anti-Scraper & Bot Shield
 * Prevents automated DMCA bots, headless browsers, and programmatic scripts
 * from harvesting stream sources or triggering playback automatically.
 */

export function isHumanInteraction(event?: React.SyntheticEvent | Event | null): boolean {
  // 1. Detect headless automation (Playwright, Puppeteer, Selenium)
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    if (navigator.webdriver) {
      return false;
    }
  }

  // 2. Reject programmatic synthetic clicks (bots calling element.click())
  if (event) {
    const nativeEvent = "nativeEvent" in event ? (event as React.SyntheticEvent).nativeEvent : event;
    if ("isTrusted" in nativeEvent && nativeEvent.isTrusted === false) {
      return false;
    }
  }

  return true;
}
