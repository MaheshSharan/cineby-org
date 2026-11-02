import { useState } from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { PageSeo } from "@/components/seo/PageSeo";
import { fetchSportsData, findMatchBySlugOrId, isMatchLive } from "@/lib/sports/sportsService";
import { type SportMatch, getSportWatchHref } from "@/lib/sports/types";
import { LiveSportsRow } from "@/components/sports/LiveSportsRow";
import { TrophyIcon } from "@/components/ui/icons";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { sanitizeJsonLd } from "@/lib/seo/jsonLd";

interface SportWatchPageProps {
  match: SportMatch;
  relatedMatches: SportMatch[];
}

export default function SportWatchPage({ match, relatedMatches }: SportWatchPageProps) {
  // Server switching: server 0 = main (HD), server 1..n = substreams (e.g. SD 540p / mirrors)
  const [activeServerIndex, setActiveServerIndex] = useState(0);

  const servers = [
    {
      name: "Server 1 (HD)",
      tag: match.source_tag || "HD Stream",
      iframe: match.iframe,
    },
    ...(match.substreams?.map((s, idx) => ({
      name: `Server ${idx + 2} (${s.source_tag?.split("|")[0]?.trim() || "SD"})`,
      tag: s.source_tag || s.tag || "Alternate Mirror",
      iframe: s.iframe,
    })) ?? []),
  ];

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

      <div className="min-h-screen pb-20 pt-20 md:pt-24 layout-container">
        {/* Navigation Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs sm:text-sm text-white/50">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/sports" className="hover:text-white transition-colors">
            Sports
          </Link>
          <span>/</span>
          <span className="text-white/80 truncate max-w-[240px] sm:max-w-md">{match.name}</span>
        </div>

        {/* Player Container */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              key={currentIframe}
              src={currentIframe}
              title={match.name}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>

          {/* Player Bottom Control & Server Switcher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0a0d14]/90 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                Servers:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {servers.map((srv, idx) => {
                  const isActive = idx === activeServerIndex;
                  return (
                    <button
                      key={srv.name}
                      type="button"
                      onClick={() => setActiveServerIndex(idx)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all duration-200 ${
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
            <div className="flex items-center gap-3">
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
            <LiveSportsRow initialMatches={relatedMatches} />
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

  context.res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");

  try {
    const data = await fetchSportsData();
    const match = findMatchBySlugOrId(data.all, rawSlug);

    if (!match) {
      return { notFound: true };
    }

    // Exclude current match from related matches
    const relatedMatches = data.all
      .filter((m) => m.uri_name !== match.uri_name && m.id !== match.id)
      .slice(0, 15);

    return {
      props: {
        match,
        relatedMatches,
      },
    };
  } catch {
    return { notFound: true };
  }
};
