import { useMemo, useState } from "react";
import type { GetStaticProps } from "next";
import Link from "next/link";
import { PageSeo } from "@/components/seo/PageSeo";
import { SportCard } from "@/components/sports/SportCard";
import { useSportsData } from "@/hooks/useSportsData";
import type { FlattenedSportsData, SportMatch } from "@/lib/sports/types";
import { TrophyIcon } from "@/components/ui/icons";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { sanitizeJsonLd } from "@/lib/seo/jsonLd";
import { trackEvent } from "@/lib/analytics/gtag";
import { getSportWatchHref } from "@/lib/sports/types";
import { edgeTtl } from "@/lib/cache/profiles";

interface SportsPageProps {
  initialData: FlattenedSportsData | null;
}

const POPULAR_LEAGUES = [
  { name: "Premier League", tag: "Premier League", category: "Football", badge: "PL" },
  { name: "Champions League", tag: "Champions League", category: "Football", badge: "UCL" },
  { name: "La Liga", tag: "La Liga", category: "Football", badge: "LL" },
  { name: "Serie A", tag: "Serie A", category: "Football", badge: "SA" },
  { name: "Bundesliga", tag: "Bundesliga", category: "Football", badge: "BL" },
  { name: "Ligue 1", tag: "Ligue 1", category: "Football", badge: "L1" },
  { name: "NBA", tag: "NBA", category: "Basketball", badge: "NBA" },
  { name: "NFL", tag: "NFL", category: "American Football", badge: "NFL" },
];

export default function SportsPage({ initialData }: SportsPageProps) {
  const { data: sportsData, isLoading, isRefreshing, refresh } = useSportsData(initialData);
  const [activeTab, setActiveTab] = useState<"live" | "upcoming" | "all">("live");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    trackEvent({
      action: "sport_category_filter",
      params: {
        category: cat,
        active_tab: activeTab,
      },
    });
  };

  const handleTabSelect = (tab: "live" | "upcoming" | "all") => {
    setActiveTab(tab);
    trackEvent({
      action: "sport_category_filter",
      params: {
        category: selectedCategory,
        active_tab: tab,
      },
    });
  };

  const categories = useMemo(() => {
    if (!sportsData?.categories) return ["All"];
    return ["All", ...sportsData.categories];
  }, [sportsData?.categories]);

  const matchesPool = useMemo(() => {
    if (!sportsData) return [];
    if (activeTab === "live") return sportsData.liveNow;
    if (activeTab === "upcoming") return sportsData.upcoming;
    return sportsData.all;
  }, [sportsData, activeTab]);

  const filteredMatches = useMemo(() => {
    let result = matchesPool;

    if (selectedCategory !== "All") {
      result = result.filter(
        (m) => m.category_name?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.tag?.toLowerCase().includes(q) ||
          m.category_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [matchesPool, selectedCategory, searchQuery]);

  // Featured Spotlight Hero: Top live or top match
  const featuredMatch: SportMatch | null = useMemo(() => {
    if (sportsData?.liveNow && sportsData.liveNow.length > 0) {
      return sportsData.liveNow[0];
    }
    if (sportsData?.all && sportsData.all.length > 0) {
      return sportsData.all[0];
    }
    return null;
  }, [sportsData]);

  // Upcoming matches sidebar/section (real upcoming data)
  const upcomingMatches = useMemo(() => {
    if (!sportsData?.upcoming) return [];
    return sportsData.upcoming.slice(0, 5);
  }, [sportsData?.upcoming]);

  const sportsHubJsonLd = useMemo(() => {
    return sanitizeJsonLd([
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Live Sports Streaming - Watch Football, F1, PPV & NBA | Cineby",
        description:
          "Stream live sports matches online free. Watch Premier League, Champions League, Formula 1, PPV fights, NBA, and NFL streams in HD on Cineby.",
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "How can I watch free live sports on mobile & Smart TV?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Cineby Sports is fully mobile and Smart TV responsive. Visit thecineby.org/sports on any browser or PWA install to stream with zero plugins or APK downloads.",
            },
          },
          {
            "@type": "Question",
            name: "What if a sports stream server buffers or lags?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Every match page has a server selector. If a stream buffers or lags, switch to another server.",
            },
          },
        ],
      },
    ]);
  }, []);

  return (
    <>
      <PageSeo
        title="Live Sports Streaming - Watch Football, F1, PPV & NBA Free | Cineby"
        description="Stream live sports matches online free in HD. Watch F1, streamed football, PPV fights, Premier League, Champions League, NBA, NFL, and Cricket on Cineby."
        path="/sports"
        jsonLd={sportsHubJsonLd}
      />

      <div className="min-h-screen pb-20 pt-20 md:pt-24 layout-container w-full max-w-full overflow-x-hidden">
        {/* Top Breadcrumb & Live Refresh Action */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white/50">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Sports</span>
          </div>

          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing || isLoading}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 ${
              isRefreshing
                ? "bg-white/10 text-white/50 border-white/10 cursor-not-allowed"
                : "bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/10 border-white/10 active:scale-95"
            }`}
            title="Fetch latest matches and kickoff times"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isRefreshing ? "animate-spin text-primary" : ""}
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        {/* Featured Spotlight Banner (Reference Match Hero) */}
        {featuredMatch ? (
          <div className="mb-8 w-full max-w-full overflow-hidden">
            <SportCard match={featuredMatch} variant="featured" sourceLocation="sports_hub" />
          </div>
        ) : null}

        {/* Ad Placement: Just under Hero section and above main category filters */}
        <NativeBannerAd className="my-6" />

        {/* Category Pills (Horizontal Scrollable on Mobile) */}
        <div className="mb-8 w-full max-w-full overflow-hidden">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 pt-1 w-full -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`flex-shrink-0 flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-500"
                      : "bg-[#11141c] text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live & Ongoing Section Header + Search Controls */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full max-w-full">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Live &amp; Ongoing Matches</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Live / Upcoming / All Toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] p-1 border border-white/10 backdrop-blur-md self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleTabSelect("live")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  activeTab === "live"
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-white/60 hover:text-white"
                }`}
              >
                <span>Live Now</span>
                {sportsData?.liveNow?.length ? (
                  <span className="rounded-full bg-black/40 px-1.5 py-0.2 text-[10px]">
                    {sportsData.liveNow.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect("upcoming")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  activeTab === "upcoming"
                    ? "bg-white/20 text-white shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Upcoming
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  activeTab === "all"
                    ? "bg-white/20 text-white shadow-md"
                    : "text-white/60 hover:text-white"
                }`}
              >
                All
              </button>
            </div>

            {/* Match Search Input */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team or league..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-white placeholder-white/40 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 backdrop-blur-md"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main Content Layout: Grid + Real Upcoming Matches Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start w-full max-w-full">
          {/* Matches Grid (3 cols on desktop) */}
          <div className="lg:col-span-3 w-full max-w-full">
            {isLoading && filteredMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent mb-3" />
                <h3 className="text-sm font-semibold text-white/80">Loading streams...</h3>
              </div>
            ) : filteredMatches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredMatches.map((match) => (
                  <SportCard
                    key={`${match.id}-${match.uri_name}`}
                    match={match}
                    variant="grid"
                    sourceLocation="sports_hub"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
                <TrophyIcon size={40} className="text-white/20 mb-3" />
                <h3 className="text-base font-semibold text-white/80">No matches found</h3>
                <p className="text-xs text-white/40 mt-1 max-w-sm">
                  {searchQuery
                    ? `No matches found for "${searchQuery}".`
                    : "No sports streams currently available in this filter."}
                </p>
              </div>
            )}
          </div>

          {/* Upcoming Matches Panel (Right column on desktop, stacked on mobile) */}
          {upcomingMatches.length > 0 && (
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-[#0d1017]/80 p-4 backdrop-blur-xl w-full max-w-full">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  <span>Upcoming Matches</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabSelect("upcoming")}
                  className="text-[11px] text-red-400 hover:text-red-300 font-semibold transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {upcomingMatches.map((m) => {
                  const dateObj = new Date(m.starts_at * 1000);
                  const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  return (
                    <Link
                      key={m.id}
                      href={getSportWatchHref(m.uri_name)}
                      className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white/90 truncate group-hover:text-red-400 transition-colors">
                          {m.name}
                        </p>
                        <p className="text-[10px] text-white/50 truncate font-medium">
                          {m.tag || m.category_name}
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-white/70 whitespace-nowrap px-2 py-0.5 rounded bg-white/5 border border-white/5">
                        {timeStr}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Explore by League (Matching Reference Card Section) */}
        <div className="mt-8 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Explore by League
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {POPULAR_LEAGUES.map((league) => (
              <button
                key={league.name}
                type="button"
                onClick={() => {
                  setSearchQuery(league.name);
                  setActiveTab("all");
                }}
                className="group flex flex-col items-center justify-center p-3 rounded-xl bg-[#0f131c] border border-white/10 hover:border-red-500/50 hover:bg-[#141a26] transition-all duration-200 text-center active:scale-95"
              >
                <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-extrabold text-[11px] text-white/80 group-hover:text-red-400 group-hover:border-red-500/30 transition-colors mb-2">
                  {league.badge}
                </div>
                <span className="text-xs font-semibold text-white/90 truncate max-w-full group-hover:text-white">
                  {league.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sports SEO Descriptive Guide & FAQ */}
        <section className="mt-12 border-t border-white/[0.08] pt-10 text-white/80 space-y-6 text-left">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mb-2 uppercase">
              Free Live Sports Streaming Online in HD — Football, F1, PPV &amp; NBA
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-white/60 leading-relaxed font-normal">
              <p>
                Cineby Sports lists live and upcoming matches across football, Formula 1, the Champions League, the Premier League, NBA, NFL and combat sports. Open a match to watch it free, with no subscription.
              </p>
              <p>
                Each match page has a server selector, so you can switch servers if a stream is slow.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white">How to watch free live sports on mobile &amp; Smart TV?</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Cineby Sports is 100% web and PWA-compatible. Simply open Cineby on Chrome, Safari, Android TV, or Amazon Firestick and select any live match for full-screen HD playback without installing third-party APKs.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-2">
              <h3 className="text-sm font-semibold text-white">What if a sports stream server buffers or lags?</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Every match page has a server selector. If a stream buffers or lags, switch to another server.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<SportsPageProps> = async () => {
  return {
    props: {
      initialData: null,
    },
    revalidate: edgeTtl("page"),
  };
};
