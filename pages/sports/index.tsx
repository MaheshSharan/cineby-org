import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import { PageSeo } from "@/components/seo/PageSeo";
import { SportCard } from "@/components/sports/SportCard";
import { fetchSportsData } from "@/lib/sports/sportsService";
import { useSportsData } from "@/hooks/useSportsData";
import type { FlattenedSportsData, SportMatch } from "@/lib/sports/types";
import { TrophyIcon } from "@/components/ui/icons";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { sanitizeJsonLd } from "@/lib/seo/jsonLd";
import { trackEvent } from "@/lib/analytics/gtag";

interface SportsPageProps {
  initialData: FlattenedSportsData | null;
}

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

  // Find top live match or top match for the spotlight hero
  const featuredMatch: SportMatch | null = useMemo(() => {
    if (sportsData?.liveNow && sportsData.liveNow.length > 0) {
      return sportsData.liveNow[0];
    }
    if (sportsData?.all && sportsData.all.length > 0) {
      return sportsData.all[0];
    }
    return null;
  }, [sportsData]);

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
              text: "Cineby Sports is fully mobile and Smart TV responsive. Visit cineby.group/sports on any browser or PWA install to stream with zero plugins or APK downloads.",
            },
          },
          {
            "@type": "Question",
            name: "What alternatives does Cineby offer compared to CBS Sports or Epic Sports?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Cineby offers an ad-light, multi-server alternative to CBS Sports, Epic Sports (epicsports com), and Stream PK with instant 1080p and 540p mirror feeds across all global leagues.",
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

      <div className="min-h-screen pb-20 pt-24 md:pt-28 layout-container">
        {/* Page Header Header & Breadcrumb */}
        <div className="mb-6 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span>Home</span>
            <span>/</span>
            <span className="text-white font-medium">Sports</span>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <TrophyIcon size={20} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Live Sports Hub
                </h1>
                <p className="text-xs sm:text-sm text-white/50">
                  Live matches, ongoing tournaments, and upcoming game streams
                </p>
              </div>
            </div>

            {/* Stateful Hard-Refresh Button */}
            <button
              type="button"
              onClick={() => refresh()}
              disabled={isRefreshing || isLoading}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                isRefreshing
                  ? "bg-white/10 text-white/50 border-white/10 cursor-not-allowed"
                  : "bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/10 border-white/10 active:scale-95"
              }`}
              title="Fetch latest matches and kickoff times"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
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
              <span>{isRefreshing ? "Refreshing..." : "Refresh Live"}</span>
            </button>
          </div>
        </div>

        {/* Featured Spotlight Banner */}
        {featuredMatch ? (
          <div className="mb-10">
            <SportCard match={featuredMatch} variant="featured" />
          </div>
        ) : null}

        {/* Controls Bar: Status Tabs, Category Filter & Search */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Live / Upcoming / All Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-white/[0.05] p-1 border border-white/10 backdrop-blur-md self-start">
              <button
                type="button"
                onClick={() => handleTabSelect("live")}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === "live"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                <span>Live Now</span>
                {sportsData?.liveNow?.length ? (
                  <span className="ml-1 rounded-full bg-black/30 px-1.5 py-0.2 text-[10px]">
                    {sportsData.liveNow.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect("upcoming")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === "upcoming"
                    ? "bg-white/20 text-white shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>Upcoming</span>
                {sportsData?.upcoming?.length ? (
                  <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.2 text-[10px]">
                    {sportsData.upcoming.length}
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => handleTabSelect("all")}
                className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === "all"
                    ? "bg-white/20 text-white shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                All Streams
              </button>
            </div>

            {/* Match Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team, match, league..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary backdrop-blur-md"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/50 hover:text-white"
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 pt-1">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-primary text-white shadow-[0_0_12px_rgba(229,9,20,0.4)] border border-primary"
                      : "bg-white/[0.04] text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Matches Grid */}
        {isLoading && filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
            <h3 className="text-base font-semibold text-white/80">Loading live matches...</h3>
          </div>
        ) : filteredMatches.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredMatches.slice(0, 8).map((match) => (
                <SportCard key={`${match.id}-${match.uri_name}`} match={match} variant="grid" />
              ))}
            </div>

            <NativeBannerAd className="my-8" />

            {filteredMatches.length > 8 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredMatches.slice(8).map((match) => (
                  <SportCard key={`${match.id}-${match.uri_name}`} match={match} variant="grid" />
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <TrophyIcon size={40} className="text-white/20 mb-3" />
            <h3 className="text-base font-semibold text-white/80">No matches found</h3>
            <p className="text-xs text-white/40 mt-1 max-w-sm">
              {searchQuery
                ? `No sports matches matched "${searchQuery}". Try a different keyword.`
                : "No live sports events currently found in this category. Check back soon or switch tabs."}
            </p>
          </div>
        )}

        {/* Sports SEO Descriptive Guide & FAQ for Search Engines */}
        <section className="mt-16 border-t border-white/[0.08] pt-12 text-white/80 space-y-8 text-left">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-3 uppercase">
              Free Live Sports Streaming Online in HD — Football, F1, PPV &amp; NBA
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-white/60 leading-relaxed font-normal">
              <p>
                Looking for reliable <strong className="text-white font-medium">streamed football</strong>, <strong className="text-white font-medium">F1 live streams</strong>, or <strong className="text-white font-medium">free PPV fight events</strong>? Cineby Sports provides edge-accelerated, buffer-free live sports coverage across all major leagues worldwide. Stream live football, Formula 1 Grand Prix, UEFA Champions League, Premier League, NBA basketball, NFL football, and combat sports completely free with zero subscription requirements.
              </p>
              <p>
                As top alternatives to legacy portals like <strong className="text-white font-medium">CBS Sports</strong>, <strong className="text-white font-medium">Epic Sports (epicsports com)</strong>, and <strong className="text-white font-medium">Stream PK</strong>, Cineby delivers high-bitrate multi-server feeds with instant kickoff countdowns, real-time viewer tracking, and adaptive player mirrors that keep you connected without aggressive popup interruptions.
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
                Every match page includes a redundant multi-server selector (Server 1 HD, Server 2 SD/540p). If your network experiences throttling, switch servers with one click for uninterrupted streaming.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SportsPageProps> = async ({ res }) => {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  // Keep SSR instantaneous with zero upstream blocking; browser hydrates via client-side cache
  return {
    props: {
      initialData: null,
    },
  };
};
