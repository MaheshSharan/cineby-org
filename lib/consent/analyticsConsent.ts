import { useEffect, useState } from "react";

export type ConsentChoice = "granted" | "denied";

const CONSENT_STORAGE_KEY = "cineby_analytics_consent";
const CONSENT_CHANGE_EVENT = "cineby:consent-change";

/** The visitor's saved choice, or null while they have not decided. */
export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;

  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice | null): void {
  try {
    if (choice) {
      localStorage.setItem(CONSENT_STORAGE_KEY, choice);
    } else {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
    }
  } catch {
    // Private browsing: the choice only lasts for this page view.
  }

  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT));
}

/** Current choice. `undefined` until the browser has been checked, so the server render stays consistent. */
export function useConsent(): ConsentChoice | null | undefined {
  const [choice, setChoice] = useState<ConsentChoice | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => setChoice(readConsent());
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
  }, []);

  return choice;
}
