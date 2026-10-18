import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { MediaSummary } from "@/lib/tmdb";
import { getBackdropResponsiveUrls, getLogoUrl } from "@/lib/tmdb/image";
import { getEpisodeHref, getMediaHref, getPlayHref, getYear } from "@/lib/utils/media";
import { useSettings } from "@/hooks/useSettings";
import { useDetailModal } from "@/components/detail/DetailModalContext";
import { HeroSkeleton } from "@/components/skeleton/HeroSkeleton";
import { PlayButton } from "@/components/ui/PlayButton";
import { StarIcon } from "@/components/ui/icons";

const HERO_AUTOPLAY_MS = 6500;

interface HeroCarouselProps {
  items: MediaSummary[];
  genreNames: Record<number, string>;
}

function getGenreNames(item: MediaSummary, genreNames: Record<number, string>): string[] {
  return item.genreIds
    .map((id) => genreNames[id])
    .filter((name): name is string => Boolean(name));
}

export function HeroCarousel({ items, genreNames }: HeroCarouselProps) {
  const length = items.length;
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        {items.map((item, slideIdx) => {
          const isActive = slideIdx === index;
          return (
            <div
              key={item.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ease-in-out ${
                isActive ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0"
              }`}
            >
              {isActive || Math.abs(slideIdx - index) <= 1 ? (
                <HeroSlide item={item} genreNames={genreNames} isActive={isActive} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Carousel Navigation Indicators */}
      {length > 1 ? (
        <div
          className="absolute bottom-20 right-6 z-20 hidden items-center gap-2 lg:bottom-24 lg:right-16 lg:flex"
          aria-label="Carousel pagination"
        >
          {items.map((item, dotIdx) => {
            const isCurrent = dotIdx === index;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`Go to slide ${dotIdx + 1}: ${item.title}`}
                aria-current={isCurrent ? "true" : "false"}
                onClick={() => setIndex(dotIdx)}
                className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                  isCurrent
                    ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                    : "w-2 bg-white/35 hover:bg-white/70"
                }`}
              />
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
  const { mobile, desktop } = getBackdropResponsiveUrls(item.backdropPath);
  const year = getYear(item.releaseDate);
  const genres = getGenreNames(item, genreNames);
  const rating = item.voteAverage ? item.voteAverage.toFixed(1) : null;

  const playHref =
    item.mediaType === "tv"
      ? getEpisodeHref(item.id, 1, 1)
      : getPlayHref(item.mediaType, item.id);
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
      {/* Backdrop Layer with 20vh Extension into Content Row (Cinejoy Style) */}
      <div
        className="absolute top-0 left-0 right-0 z-0 overflow-hidden pointer-events-none"
        style={{
          height: "calc(100% + 20vh)",
          maskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
        }}
      >
        {/* Ambient Blur Glow */}
        {desktop || mobile ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={desktop || mobile || ""}
              alt=""
              className="absolute inset-0 h-full w-full object-cover scale-125 blur-[70px] saturate-150 opacity-40 transition-opacity duration-1000"
            />
          </div>
        ) : null}

        {/* Main Sharp Backdrop */}
        {mobile ? (
          <picture className="absolute inset-0 block h-full w-full">
            {desktop ? <source media="(min-width: 768px)" srcSet={desktop} /> : null}
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

        {/* Top Header Shadow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-32 bg-gradient-to-b from-[#05070a]/80 via-[#05070a]/35 to-transparent"
        />

        {/* Subtle Vignettes from Bottom and Left */}
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
          <div className="max-w-2xl translate-y-4">
            {/* Title / Logo */}
            {item.logoPath && settings.appearance.useImageLogos ? (
              <div className="mb-4 max-w-[280px] sm:max-w-[340px] md:max-w-[420px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(item.logoPath) ?? undefined}
                  alt={item.title}
                  className="max-h-24 w-auto object-contain object-left drop-shadow-2xl md:max-h-32"
                />
              </div>
            ) : (
              <h1 className="font-sans text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-text-hi drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)] md:text-4xl xl:text-5xl">
                {item.title}
              </h1>
            )}

            {/* Meta Tags: Rating, Year, Genres */}
            <div className="mt-[18px] mb-[12px] inline-flex flex-wrap items-center gap-[10px_14px] text-[13px] leading-none text-text-hi md:text-sm">
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

            {/* Overview description */}
            <p className="line-clamp-3 max-w-[560px] text-[14px] leading-[1.6] tracking-[0.01em] text-[rgba(238,241,246,0.85)] drop-shadow md:text-[15px]">
              {item.overview}
            </p>

            {/* Action Buttons: Play + See More */}
            <div className="mt-[22px] flex items-center gap-3">
              <PlayButton href={playHref} size="lg" label="Play" />

              <Link
                href={mediaHref}
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
