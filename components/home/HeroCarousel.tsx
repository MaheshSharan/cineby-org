import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";

import type { MediaSummary } from "@/lib/tmdb";
import { buildImageUrl, getBackdropResponsiveUrls, getLogoUrl } from "@/lib/tmdb/image";
import { getEpisodeHref, getMediaHref, getPlayHref, getYear } from "@/lib/utils/media";
import { useSettings } from "@/hooks/useSettings";
import { useDetailModal } from "@/components/detail/DetailModalContext";
import { HeroSkeleton } from "@/components/skeleton/HeroSkeleton";
import { PlayButton } from "@/components/ui/PlayButton";
import { StarIcon, TrophyIcon } from "@/components/ui/icons";
import { type SportMatch, getSportWatchHref } from "@/lib/sports/types";
import { isFamousMatch } from "@/lib/sports/sportsService";
import { fetchSportsClientSide } from "@/hooks/useSportsData";
import { trackEvent } from "@/lib/analytics/gtag";

const HERO_AUTOPLAY_MS = 6500;

interface HeroCarouselProps {
  items: MediaSummary[];
  genreNames: Record<number, string>;
}

type HeroSlideItem =
  | { kind: "media"; data: MediaSummary }
  | { kind: "sport"; data: SportMatch };

function getGenreNames(item: MediaSummary, genreNames: Record<number, string>): string[] {
  return item.genreIds
    .map((id) => genreNames[id])
    .filter((name): name is string => Boolean(name));
}

export function HeroCarousel({ items, genreNames }: HeroCarouselProps) {
  const [famousMatch, setFamousMatch] = useState<SportMatch | null>(null);
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch only top famous match (Champions League, Premier League, Real Madrid, NBA, etc.)
  useEffect(() => {
    let isCurrent = true;
    fetchSportsClientSide()
      .then((data) => {
        if (!isCurrent || !data) return;
        const famous = data.liveNow.filter((m) => isFamousMatch(m));
        if (famous.length > 0) {
          setFamousMatch(famous[0]);
        }
      })
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, []);

  // Merge famous match as a full slide alongside movie/tv items
  const slides: HeroSlideItem[] = useMemo(() => {
    const list: HeroSlideItem[] = items.map((data) => ({ kind: "media", data }));
    if (famousMatch) {
      // Insert famous sports game into top 3 of the hero rotation
      list.splice(1, 0, { kind: "sport", data: famousMatch });
    }
    return list;
  }, [items, famousMatch]);

  const length = slides.length;

  useEffect(() => {
    if (length > 1) {
      setIndex(Math.floor(Math.random() * length));
    }
  }, [length]);

  useEffect(() => {
    if (length <= 1 || isPaused) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      return;
    }

    autoplayTimerRef.current = setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, HERO_AUTOPLAY_MS);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [length, isPaused]);

  if (length === 0) {
    return <HeroSkeleton />;
  }

  return (
    <section
      aria-label="Featured content"
      className="group/carousel relative z-0 h-[85vh] w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div className="relative h-full w-full">
        {slides.map((slide, slideIdx) => {
          const isActive = slideIdx === index;
          const key = slide.kind === "media" ? `media-${slide.data.id}` : `sport-${slide.data.id}`;
          return (
            <div
              key={key}
              aria-hidden={!isActive}
              className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${
                isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
              }`}
            >
              {isActive || Math.abs(slideIdx - index) <= 1 ? (
                slide.kind === "media" ? (
                  <HeroSlide item={slide.data} genreNames={genreNames} isActive={isActive} />
                ) : (
                  <SportHeroSlide match={slide.data} isActive={isActive} />
                )
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Carousel Navigation Indicators */}
      {length > 1 ? (
        <div
          className="absolute bottom-20 right-6 z-20 hidden items-center gap-1 lg:bottom-24 lg:right-16 lg:flex"
          aria-label="Carousel pagination"
        >
          {slides.map((slide, dotIdx) => {
            const isCurrent = dotIdx === index;
            const key = slide.kind === "media" ? `dot-media-${slide.data.id}` : `dot-sport-${slide.data.id}`;
            return (
              <button
                key={key}
                type="button"
                aria-label={`Go to slide ${dotIdx + 1}`}
                aria-current={isCurrent ? "true" : "false"}
                onClick={() => setIndex(dotIdx)}
                className="min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer p-1"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-300 block ${
                    isCurrent
                      ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                      : "w-2 bg-white/35 hover:bg-white/70"
                  }`}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

interface HeroSlideProps {
  item: MediaSummary;
  genreNames: Record<number, string>;
  isActive: boolean;
}

function HeroSlide({ item, genreNames, isActive }: HeroSlideProps) {
  const { settings } = useSettings();
  const { openDetailModal } = useDetailModal();

  const isModalDetail = settings.appearance.detailViewType === "modal";
  const { mobile, tablet, desktop, desktopSrcSet } = getBackdropResponsiveUrls(item.backdropPath);
  // Phones are portrait: a textless poster fits them without heavy cropping or upscaling. Without one,
  // the backdrop is used, because a regular poster would show its title text under our logo.
  const phonePoster = buildImageUrl(item.heroPosterPath, "w780");
  const year = getYear(item.releaseDate);
  const genres = getGenreNames(item, genreNames);
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : null;

  const playHref =
    item.mediaType === "tv"
      ? getEpisodeHref(item.id, 1, 1, null, item.title)
      : getPlayHref(item.mediaType, item.id, null, item.title);
  const mediaHref = getMediaHref(item.mediaType, item.id, item.title);

  const handleSeeMoreClick = (e: React.MouseEvent) => {
    if (isModalDetail) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      openDetailModal({ mediaType: item.mediaType, id: item.id });
    }
  };

  return (
    <div className="relative h-full w-full">
      {/* Backdrop Layer */}
      <div
        className="absolute top-0 left-0 right-0 z-0 overflow-hidden pointer-events-none"
        style={{
          height: "calc(100% + 20vh)",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
        }}
      >
        {desktop || mobile ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={desktop || mobile || ""}
              alt={`${item.title} background blur`}
              className="absolute inset-0 h-full w-full object-cover scale-125 blur-[70px] saturate-150 opacity-40 transition-opacity duration-1000"
            />
          </div>
        ) : null}

        {mobile ? (
          <picture className="absolute inset-0 block h-full w-full">
            {phonePoster ? <source media="(max-width: 599px)" srcSet={phonePoster} /> : null}
            {desktopSrcSet ? (
              <source media="(min-width: 960px)" srcSet={desktopSrcSet} sizes="100vw" />
            ) : desktop ? (
              <source media="(min-width: 960px)" srcSet={desktop} />
            ) : null}
            {tablet ? <source media="(min-width: 600px)" srcSet={tablet} /> : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mobile}
              alt={item.title}
              fetchPriority={isActive ? "high" : "low"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ease-out"
            />
          </picture>
        ) : null}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-32 bg-gradient-to-b from-[#05070a]/80 via-[#05070a]/35 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/40 via-transparent to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-black/40 via-transparent to-transparent"
        />
      </div>

      {/* Hero Content Overlay */}
      <div className="absolute inset-0 z-[3] flex items-end pb-16 md:pb-20 lg:pb-24">
        <div className="layout-container w-full">
          <div className="max-w-2xl translate-y-4 max-md:mx-auto max-md:text-center">
            {item.logoPath && settings.appearance.useImageLogos ? (
              <div className="mb-4 max-w-[320px] max-md:mx-auto sm:max-w-[340px] md:max-w-[420px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(item.logoPath) ?? undefined}
                  alt={item.title}
                  className="max-h-28 w-auto object-contain object-center drop-shadow-2xl max-md:mx-auto md:max-h-32 md:object-left"
                />
              </div>
            ) : (
              <h2 className="font-sans text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-text-hi drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)] md:text-4xl xl:text-5xl">
                {item.title}
              </h2>
            )}

            <div className="mt-[18px] mb-[12px] flex flex-wrap items-center justify-center gap-[10px_14px] md:inline-flex md:justify-start text-[13px] leading-none text-text-hi md:text-sm">
              {rating ? (
                <div className="inline-flex items-center gap-1.5 drop-shadow">
                  <StarIcon size={16} className="fill-white text-white shrink-0" />
                  <span className="font-semibold text-white">
                    {rating}
                    <span className="text-white/70 font-normal">/10</span>
                  </span>
                </div>
              ) : null}

              {year ? (
                <span className="inline-flex items-center gap-1.5 font-medium tracking-[0.02em] text-[rgba(238,241,246,0.9)]">
                  {rating ? (
                    <span aria-hidden="true" className="inline-block h-[3px] w-[3px] rounded-full bg-white/40" />
                  ) : null}
                  {year}
                </span>
              ) : null}

              {genres.map((genre, idx) => (
                <span key={genre} className="inline-flex items-center gap-1.5 font-medium text-[rgba(238,241,246,0.85)]">
                  {year || rating || idx > 0 ? (
                    <span aria-hidden="true" className="inline-block h-[3px] w-[3px] rounded-full bg-white/40" />
                  ) : null}
                  {genre}
                </span>
              ))}
            </div>

            <p className="line-clamp-3 max-w-[560px] max-md:mx-auto text-[14px] leading-[1.6] tracking-[0.01em] text-[rgba(238,241,246,0.85)] drop-shadow md:text-[15px]">
              {item.overview}
            </p>

            <div className="mt-[22px] flex items-center gap-3 max-md:justify-center">
              <PlayButton href={playHref} size="lg" label="Play" tabIndex={isActive ? 0 : -1} />
              <Link
                href={mediaHref}
                tabIndex={isActive ? 0 : -1}
                onClick={handleSeeMoreClick}
                className="flex h-[52px] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 font-medium tracking-tight text-white backdrop-blur-[16px] transition-all duration-200 hover:border-white/30 hover:bg-white/15 hover:shadow-glow active:scale-[0.98]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-info text-white"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span>See More</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SportHeroSlideProps {
  match: SportMatch;
  isActive: boolean;
}

function SportHeroSlide({ match, isActive }: SportHeroSlideProps) {
  const watchHref = getSportWatchHref(match.uri_name);
  const viewers = typeof match.viewers === "string" ? Number.parseInt(match.viewers, 10) : Number(match.viewers || 0);

  const handleSportHeroClick = () => {
    trackEvent({
      action: "sport_click",
      params: {
        match_id: String(match.id || match.uri_name),
        match_name: match.name,
        sport_category: match.category_name || "Unknown",
        league_tag: match.tag || undefined,
        source_location: "hero_carousel",
      },
    });
  };

  return (
    <div className="relative h-full w-full">
      {/* Backdrop Layer */}
      <div
        className="absolute top-0 left-0 right-0 z-0 overflow-hidden pointer-events-none"
        style={{
          height: "calc(100% + 20vh)",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
        }}
      >
        {match.poster ? (
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={match.poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover scale-125 blur-[70px] saturate-150 opacity-40 transition-opacity duration-1000"
              />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={match.poster}
              alt={match.name}
              fetchPriority={isActive ? "high" : "low"}
              className="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-out"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c1017] via-[#05070a] to-black" />
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-32 bg-gradient-to-b from-[#05070a]/80 via-[#05070a]/35 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-black/80 via-black/30 to-transparent"
        />
      </div>

      {/* Hero Content Overlay */}
      <div className="absolute inset-0 z-[3] flex items-end pb-16 md:pb-20 lg:pb-24">
        <div className="layout-container w-full">
          <div className="max-w-2xl translate-y-4 space-y-4 max-md:mx-auto max-md:text-center">
            {/* Live Indicator Header Tag */}
            <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span>LIVE SPORTS</span>
              <span className="h-3 w-px bg-white/20" />
              <span className="text-white/80">{match.tag || match.category_name}</span>
            </div>

            <h2 className="font-sans text-2xl font-black uppercase leading-[1.0] tracking-[-0.03em] text-text-hi drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)] md:text-4xl xl:text-5xl">
              {match.name}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-white/70 md:justify-start">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                <TrophyIcon size={14} className="text-amber-400" />
                {match.category_name}
              </span>
              {viewers > 0 ? (
                <>
                  <span aria-hidden="true" className="inline-block h-1 w-1 rounded-full bg-white/40" />
                  <span className="text-emerald-400 font-medium">{viewers.toLocaleString()} watching live</span>
                </>
              ) : null}
            </div>

            <p className="line-clamp-2 max-w-[560px] max-md:mx-auto text-[14px] leading-[1.6] tracking-[0.01em] text-white/80 drop-shadow md:text-[15px]">
              Catch {match.name} streaming live in full HD on Cineby. Multi-server coverage with zero buffering.
            </p>

            <div className="pt-2 flex items-center gap-3 max-md:justify-center" onClick={handleSportHeroClick}>
              <PlayButton href={watchHref} size="lg" label="Watch Live" tabIndex={isActive ? 0 : -1} />
              <Link
                href="/sports"
                tabIndex={isActive ? 0 : -1}
                className="flex h-[52px] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 font-medium tracking-tight text-white backdrop-blur-[16px] transition-all duration-200 hover:border-white/30 hover:bg-white/15 hover:shadow-glow active:scale-[0.98]"
              >
                <span>All Matches</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
