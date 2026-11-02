import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import Link from "next/link";
import { PageSeo } from "@/components/seo/PageSeo";
import { fetchSportsData, findMatchBySlugOrId, isMatchLive } from "@/lib/sports/sportsService";
import { fetchSportsClientSide } from "@/hooks/useSportsData";
import { type SportMatch, getSportWatchHref } from "@/lib/sports/types";
import { LiveSportsRow } from "@/components/sports/LiveSportsRow";
import { TrophyIcon } from "@/components/ui/icons";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { sanitizeJsonLd } from "@/lib/seo/jsonLd";
import { initAntiRedirectShield, setAntiRedirectShieldActive } from "@/lib/security/antiRedirect";
import { trackEvent } from "@/lib/analytics/gtag";

interface SportWatchPageProps {
  initialMatch: SportMatch | null;
  initialRelatedMatches: SportMatch[];
}

export default function SportWatchPage({ initialMatch, initialRelatedMatches }: SportWatchPageProps) {
  const router = useRouter();
  const slugParam = router.query.slug;
  const rawSlug = Array.isArray(slugParam) ? slugParam.join("/") : slugParam || "";

  const [match, setMatch] = useState<SportMatch | null>(initialMatch);
  const [relatedMatches, setRelatedMatches] = useState<SportMatch[]>(initialRelatedMatches);
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [isClientLoading, setIsClientLoading] = useState(!initialMatch);

  // Client-side fallback if server-side fetch failed
  useEffect(() => {
    if (initialMatch) {
      setMatch(initialMatch);
      setRelatedMatches(initialRelatedMatches);
      setIsClientLoading(false);
      return;
    }

    if (!rawSlug) return;

    let isCurrent = true;
    setIsClientLoading(true);

    fetchSportsClientSide()
      .then((data) => {
        if (!isCurrent || !data) return;
        const found = findMatchBySlugOrId(data.all, rawSlug);
        if (found) {
          setMatch(found);
          setRelatedMatches(data.all.filter((m) => m.uri_name !== found.uri_name && m.id !== found.id).slice(0, 15));
        }
      })
      .finally(() => {
        if (isCurrent) setIsClientLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [initialMatch, initialRelatedMatches, rawSlug]);

  // Activate Cineby anti-redirect & anti-popup shield
  useEffect(() => {
    initAntiRedirectShield();
    setAntiRedirectShieldActive(true);
    return () => {
      setAntiRedirectShieldActive(false);
    };
  }, []);

  const servers = [
    {
      name: "Server 1 (HD)",
      tag: match?.source_tag || "HD Stream",
      iframe: match?.iframe,
    },
    ...(match?.substreams?.map((s, idx) => ({
      name: `Server ${idx + 2} (${s.source_tag?.split("|")[0]?.trim() || "SD"})`,
      tag: s.source_tag || s.tag || "Alternate Mirror",
      iframe: s.iframe,
    })) ?? []),
  ];

  const handleServerSwitch = (idx: number) => {
    if (idx === activeServerIndex || !match) return;
    const fromServer = servers[activeServerIndex]?.name || `Server ${activeServerIndex + 1}`;
    const toServer = servers[idx]?.name || `Server ${idx + 1}`;
    trackEvent({
      action: "sport_server_switch",
      params: {
        match_id: String(match.id || match.uri_name),
        match_name: match.name,
        sport_category: match.category_name || "Unknown",
        from_server: fromServer,
        to_server: toServer,
      },
    });
    setActiveServerIndex(idx);
  };

  // Track sport watch event on mount / match change
  useEffect(() => {
    if (!match) return;
    const isLiveNow = isMatchLive(match);
    trackEvent({
      action: "sport_watch",
      params: {
        match_id: String(match.id || match.uri_name),
        match_name: match.name,
        sport_category: match.category_name || "Unknown",
        league_tag: match.tag || undefined,
        server_name: servers[activeServerIndex]?.name || "Server 1",
        is_live: isLiveNow,
      },
    });
    trackEvent({
      action: "media_start",
      params: {
        content_id: String(match.id || match.uri_name),
        media_type: "sport",
        title: match.name,
        category: match.category_name,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, match?.uri_name]);

  if (!match) {
    if (isClientLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center pt-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
          <h3 className="text-base font-semibold text-white/80">Loading stream...</h3>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 text-center px-4">
        <TrophyIcon size={48} className="text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Match Not Found</h2>
        <p className="text-sm text-white/50 mb-6 max-w-sm">This sports event has ended or is unavailable.</p>
        <Link href="/sports" className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90">
          Back to Sports Hub
        </Link>
      </div>
    );
  }

  const currentIframe = servers[activeServerIndex]?.iframe || match.iframe;
  const isLive = isMatchLive(match);
  const viewersCount = typeof match.viewers === "string" ? Number.parseInt(match.viewers, 10) : Number(match.viewers || 0);

  const sportsEventJsonLd = sanitizeJsonLd({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: match.name,
    description: `Watch ${match.name} live stream free online in HD on Cineby. High quality streams for ${match.category_name} - ${match.tag}.`,
    startDate: match.starts_at ? new Date(match.starts_at * 1000).toISOString() : undefined,
    endDate: match.ends_at ? new Date(match.ends_at * 1000).toISOString() : undefined,
    sport: match.category_name,
    location: {
      "@type": "Place",
      name: "Online Streaming Broadcast",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  });

  return (
    <>
      <PageSeo
        title={`Watch ${match.name} Live Stream Free | Cineby Sports`}
        description={`Watch ${match.name} live stream online in HD. High quality streaming links for ${match.category_name} - ${match.tag}. Free alternative to CBS Sports and Epic Sports.`}
        path={getSportWatchHref(match.uri_name)}
        jsonLd={sportsEventJsonLd}
      />

      <div className="min-h-screen pb-20 pt-20 md:pt-24 layout-container w-full max-w-full overflow-x-hidden">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-white/50 overflow-hidden">
          <Link href="/" className="hover:text-white transition-colors flex-shrink-0">
            Home
          </Link>
          <span>/</span>
          <Link href="/sports" className="hover:text-white transition-colors flex-shrink-0">
            Sports
          </Link>
          <span>/</span>
          <span className="text-white/80 truncate min-w-0 max-w-[180px] xs:max-w-[240px] sm:max-w-md">{match.name}</span>
        </div>

        {/* Player Container */}
        <div className="relative w-full max-w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
          <div className="relative aspect-video w-full max-w-full bg-black overflow-hidden">
            <iframe
              key={currentIframe}
              src={currentIframe}
              title={match.name}
              className="absolute inset-0 h-full w-full max-w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>

          {/* Player Bottom Control & Server Switcher Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10 bg-[#0a0d14]/90 px-3 sm:px-4 py-3 backdrop-blur-xl w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full py-0.5">
              <span className="text-[11px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider flex-shrink-0">
                Servers:
              </span>
              <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap">
                {servers.map((srv, idx) => {
                  const isActive = idx === activeServerIndex;
                  return (
                    <button
                      key={srv.name}
                      type="button"
                      onClick={() => handleServerSwitch(idx)}
                      className={`rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                        isActive
                          ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5"
                      }`}
                    >
                      {srv.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Indicator / Viewers */}
            <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
              {isLive ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span>LIVE</span>
                </div>
              ) : (
                <span className="text-xs text-yellow-400/90 font-medium">Upcoming / Scheduled</span>
              )}

              {viewersCount > 0 ? (
                <span className="text-xs text-white/60">
                  {viewersCount.toLocaleString()} watching
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Match Details Section */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 md:p-6 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/10">
                  {match.category_name}
                </span>
                {match.tag ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                    {match.tag}
                  </span>
                ) : null}
                {match.locale ? (
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-white/5 text-white/50 border border-white/5">
                    {match.locale}
                  </span>
                ) : null}
              </div>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {match.name}
              </h1>

              {match.source_tag ? (
                <p className="text-xs sm:text-sm text-white/60">
                  Source Feed: <span className="text-white/90 font-medium">{match.source_tag}</span>
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/sports"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs sm:text-sm font-medium text-white transition-all duration-200 hover:bg-white/10"
              >
                <TrophyIcon size={16} />
                <span>All Matches</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Native Banner Ad Placement */}
        <NativeBannerAd className="my-8" />

        {/* Other Live Matches Section */}
        {relatedMatches.length > 0 ? (
          <div className="mt-12">
            <LiveSportsRow initialMatches={relatedMatches} sourceLocation="related_matches" />
          </div>
        ) : null}
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SportWatchPageProps> = async (context) => {
  const slugParam = context.params?.slug;
  const rawSlug = Array.isArray(slugParam) ? slugParam.join("/") : slugParam;

  if (!rawSlug) {
    return { notFound: true };
  }

  // Instant response with edge caching, zero upstream network blocking.
  // The client hydrates instantly via local cache or client-side mirror fetch.
  context.res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  return {
    props: {
      initialMatch: null,
      initialRelatedMatches: [],
    },
  };
};
