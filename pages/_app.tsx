import type { AppProps, NextWebVitalsMetric } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { SettingsProvider } from "@/hooks/useSettings";
import { DetailModalProvider } from "@/components/detail/DetailModalContext";
import { Layout } from "@/components/layout/Layout";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { UpdateToast } from "@/components/pwa/UpdateToast";
import { ScrollEdgeButton } from "@/components/ui/ScrollEdgeButton";
import { RouteProgressBar } from "@/components/ui/RouteProgressBar";
import { GA_MEASUREMENT_ID, pageView, trackEvent, setUserProperties } from "@/lib/analytics/gtag";

import "../styles/globals.css";

const DetailModal = dynamic(
  () => import("@/components/detail/DetailModal").then((mod) => mod.DetailModal),
  { ssr: false }
);

export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (!GA_MEASUREMENT_ID) return;

  const validMetrics = ["CLS", "FCP", "FID", "INP", "LCP", "TTFB"] as const;
  if (!validMetrics.includes(metric.name as (typeof validMetrics)[number])) {
    return;
  }

  // Next.js reports CLS scaled by 1000 in some versions, but metric.value holds the standard value
  const value = Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value);

  // Standard threshold ratings according to Web Vitals spec
  let rating: "good" | "needs-improvement" | "poor" = "good";
  if (metric.name === "LCP") {
    rating = value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
  } else if (metric.name === "CLS") {
    rating = value <= 100 ? "good" : value <= 250 ? "needs-improvement" : "poor";
  } else if (metric.name === "INP") {
    rating = value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
  }

  trackEvent({
    action: "web_vitals",
    params: {
      metric_name: metric.name as (typeof validMetrics)[number],
      value,
      rating,
      metric_id: metric.id,
    },
  });
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    // Report network connection context
    if (typeof navigator !== "undefined" && "connection" in navigator) {
      const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
      if (conn?.effectiveType) {
        setUserProperties({ network_type: conn.effectiveType });
      }
    }

    const handleRouteChange = (url: string) => {
      pageView(url);
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <AuthProvider>
      <Head>
        {/* viewport-fit=cover lets the app draw under the notch; layouts pad with env(safe-area-inset-*). */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      {GA_MEASUREMENT_ID && (
        <>
          {/* Google Consent Mode v2 setup (defaulting to privacy-safe measurement) */}
          <Script
            id="google-consent-mode"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('consent', 'default', {
                  'analytics_storage': 'granted',
                  'ad_storage': 'denied',
                  'ad_user_data': 'denied',
                  'ad_personalization': 'denied',
                  'wait_for_update': 500
                });
              `,
            }}
          />
          {/* Google Analytics 4 Script */}
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script
            id="google-analytics-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                  send_page_view: true
                });
              `,
            }}
          />
        </>
      )}

      <SettingsProvider>
        <DetailModalProvider>
          <RouteProgressBar />
          <Layout>
            <Component {...pageProps} />
          </Layout>
          <DetailModal />
          <ScrollEdgeButton />
          <InstallBanner />
          <UpdateToast />
        </DetailModalProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
