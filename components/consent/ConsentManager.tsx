import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/router";

import { isClarityAllowedPath } from "@/lib/analytics/clarity";
import { updateGoogleConsent } from "@/lib/analytics/gtag";
import { saveConsent, useConsent } from "@/lib/consent/analyticsConsent";
import { getClarityProjectId, isAnalyticsEnabled, isClarityEnabled } from "@/lib/env/public";

/** Names of the enabled tools that need consent, used in the banner and to decide whether to show it at all. */
function getConsentTools(): string[] {
  const tools: string[] = [];
  if (isAnalyticsEnabled()) tools.push("Google Analytics");
  if (isClarityEnabled()) tools.push("Microsoft Clarity");
  return tools;
}

/**
 * Single place for analytics consent. The visitor's choice drives Google Analytics (Consent Mode) and Microsoft
 * Clarity (only loaded after acceptance, and paused on pages where recording is not allowed).
 * Shows the consent banner on allowed pages until the visitor has chosen.
 */
export function ConsentManager() {
  const router = useRouter();
  const consent = useConsent();
  const enabled = isClarityEnabled();
  const tools = getConsentTools();
  const allowed = isClarityAllowedPath(router.asPath);
  const [hasLoadedOnAllowedPage, setHasLoadedOnAllowedPage] = useState(false);
  const wasAllowed = useRef(true);

  useEffect(() => {
    if (consent) updateGoogleConsent(consent);
  }, [consent]);

  const shouldLoad = enabled && consent === "granted" && (allowed || hasLoadedOnAllowedPage);

  useEffect(() => {
    if (enabled && consent === "granted" && allowed) setHasLoadedOnAllowedPage(true);
  }, [enabled, consent, allowed]);

  // The script cannot be unloaded, so it is told to stop on restricted pages and start again afterwards.
  useEffect(() => {
    if (!hasLoadedOnAllowedPage || wasAllowed.current === allowed) return;
    wasAllowed.current = allowed;
    window.clarity?.(allowed ? "start" : "stop");
  }, [allowed, hasLoadedOnAllowedPage]);

  if (tools.length === 0) return null;

  return (
    <>
      {shouldLoad ? (
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(getClarityProjectId())});`,
          }}
        />
      ) : null}

      {consent === null && allowed ? (
        <div
          role="dialog"
          aria-labelledby="cookie-consent-title"
          className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[60] max-w-[420px] rounded-[20px] border border-white/10 bg-[#121316]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-md sm:mx-0 md:bottom-6 md:left-6 md:right-auto"
        >
          <button
            type="button"
            aria-label="Decline and close"
            onClick={() => saveConsent("denied")}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <h2 id="cookie-consent-title" className="pr-8 text-[15px] font-semibold text-white">
            This website uses cookies.
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/80">
            We use {tools.join(" and ")} to understand how Cineby is used and to improve it. They set cookies and
            may record clicks and scrolling. Only essential cookies are on by default. See our{" "}
            <Link href="/privacy" className="font-medium text-white underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => saveConsent("granted")}
              className="h-10 rounded-full border border-white/15 bg-white/10 px-5 text-sm font-medium text-white transition-colors hover:bg-white/15"
            >
              Accept Cookies
            </button>
            <button
              type="button"
              onClick={() => saveConsent("denied")}
              className="h-10 rounded-full px-4 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Decline
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Lets a visitor change their mind: clears the choice and reloads so recording stops and the banner returns. */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  if (getConsentTools().length === 0) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.clarity?.("consent", false);
        updateGoogleConsent("denied");
        saveConsent(null);
        window.location.reload();
      }}
    >
      Cookie Settings
    </button>
  );
}
