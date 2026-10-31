import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MovieDetails, SeasonEpisodes, TvDetails } from "@/lib/tmdb";
import { getBackdropResponsiveUrls, getHeroBackdropUrl, getLogoUrl } from "@/lib/tmdb/image";
import type { HistoryEntry } from "@/lib/db/types";
import { listHistory } from "@/lib/api/history";
import {
  addToWatchlist,
  checkWatchlist,
  removeFromWatchlist,
} from "@/lib/api/watchlist";
import { calculateResumeSeconds, getEpisodeHref, getMediaHref, getPlayHref, getYear, formatRuntime, formatPlaybackTime, toPlayerSeasons } from "@/lib/utils/media";
import { getTrailerUrl } from "@/lib/services/trailer";

import { useAuth } from "@/components/auth/AuthProvider";
import { useSettings } from "@/hooks/useSettings";
import { CastRow } from "@/components/detail/CastRow";
import { EpisodesSection } from "@/components/detail/EpisodesSection";
import { RecommendationsRow } from "@/components/detail/RecommendationsRow";
import { PlayerShell } from "@/components/player/PlayerShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { PlayButton } from "@/components/ui/PlayButton";
import { ShareButton } from "@/components/detail/ShareButton";
import { DisplayBannerAd } from "@/components/ads/DisplayBannerAd";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { trackEvent } from "@/lib/analytics/gtag";
import {
  CheckIcon,
  ChevronLeftIcon,
  ListOrderedIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
} from "@/components/ui/icons";

type DetailData = MovieDetails | TvDetails;

interface DetailPageProps {
  details: DetailData;
  isPlaying: boolean;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  variant?: "page" | "modal";
  onClose?: () => void;
  initialEpisodes?: SeasonEpisodes | null;
  initialTrailerUrl?: string | null;
}

const TRAILER_DELAY_MS = 5000;

export function DetailPage({
  details,
  isPlaying,
  seasonNumber,
  episodeNumber,
  variant = "page",
  onClose,
  initialEpisodes,
  initialTrailerUrl,
}: DetailPageProps) {
  const isModal = variant === "modal";
  const router = useRouter();
  const { user, openAuthModal, showToast } = useAuth();
  const { settings } = useSettings();
  const [isMuted, setIsMuted] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
  const [historyEpisode, setHistoryEpisode] = useState<{ season: number; episode: number } | null>(null);
  const [directTrailerUrl, setDirectTrailerUrl] = useState<string | null>(initialTrailerUrl ?? null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const heroBackdrop = getHeroBackdropUrl(details.backdropPath);
  const { mobile, tablet, desktop, desktopSrcSet } = getBackdropResponsiveUrls(details.backdropPath);
  const isTv = details.mediaType === "tv";

  const [historyEntry, setHistoryEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    if (!user) {
      setHistoryEntry(null);
      setHistoryEpisode(null);
      return;
    }

    let isCurrent = true;

    const fetchHistory = () => {
      listHistory(Boolean(user))
        .then((historyList) => {
          if (!isCurrent) return;
          const match = historyList.find(
            (item) => item.mediaType === details.mediaType && item.mediaId === details.id
          );
          if (match) {
            // Only offer resume if progress is between 1% and 94% (avoid completed content)
            if (match.progress !== null && match.progress > 0 && match.progress < 95) {
              setHistoryEntry(match);
            } else {
              setHistoryEntry(null);
            }

            if (isTv && match.seasonNumber && match.episodeNumber) {
              setHistoryEpisode({ season: match.seasonNumber, episode: match.episodeNumber });
            }
          } else {
            setHistoryEntry(null);
          }
        })
        .catch(() => {});
    };

    fetchHistory();

    const handleProfileChange = () => {
      fetchHistory();
    };

    window.addEventListener("cineby:profile-change", handleProfileChange);
    window.addEventListener("storage", handleProfileChange);

    return () => {
      isCurrent = false;
      window.removeEventListener("cineby:profile-change", handleProfileChange);
      window.removeEventListener("storage", handleProfileChange);
    };
  }, [details.id, details.mediaType, isTv, user]);

  useEffect(() => {
    if (isTv) {
      return;
    }

    const id = window.requestAnimationFrame(() => setIsPageReady(true));

    return () => window.cancelAnimationFrame(id);
  }, [isTv]);

  const isTrailerEnabled = settings.appearance.trailers;

  useEffect(() => {
    if (!isTrailerEnabled) {
      setDirectTrailerUrl(null);
      setShowTrailer(false);
      setTrailerReady(false);
      return;
    }

    if (initialTrailerUrl !== undefined) {
      return;
    }

    let isCurrent = true;

    getTrailerUrl(details.imdbId).then((url) => {
      if (isCurrent && url) {
        setDirectTrailerUrl(url);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [details.imdbId, initialTrailerUrl, isTrailerEnabled]);

  useEffect(() => {
    if (!directTrailerUrl || !isTrailerEnabled) {
      setShowTrailer(false);
      setTrailerReady(false);
      return;
    }

    const timer = window.setTimeout(() => setShowTrailer(true), TRAILER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [directTrailerUrl, isTrailerEnabled]);

  useEffect(() => {
    if (!user) {
      setInWatchlist(false);
      return;
    }

    let isCurrent = true;

    checkWatchlist(details.mediaType, details.id)
      .then((result) => {
        if (isCurrent) {
          setInWatchlist(result);
        }
      })
      .catch(() => {
        // Watchlist status is best-effort; default to "not in watchlist" on failure.
        if (isCurrent) {
          setInWatchlist(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [details.id, details.mediaType, user]);

  const handleWatchlist = async () => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    setIsWatchlistLoading(true);

    try {
      const success = inWatchlist
        ? await removeFromWatchlist(details.mediaType, details.id)
        : await addToWatchlist({
            mediaType: details.mediaType,
            mediaId: details.id,
            title: details.title,
            posterPath: details.posterPath,
            backdropPath: details.backdropPath,
          });

      if (success) {
        const nextState = !inWatchlist;
        setInWatchlist(nextState);
        showToast(nextState ? "Added to watchlist" : "Removed from watchlist");

        if (nextState) {
          trackEvent({
            action: "watchlist_add",
            params: {
              content_id: String(details.id),
              media_type: details.mediaType,
              title: details.title,
            },
          });
        } else {
          trackEvent({
            action: "watchlist_remove",
            params: {
              content_id: String(details.id),
              media_type: details.mediaType,
            },
          });
        }
      }
    } catch {
      // Watchlist toggle failed — keep current state; user can retry.
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  const handleEpisodeReady = useCallback(() => {
    setIsPageReady(true);
  }, []);

  if (isPlaying) {
    const effectiveSeason = isTv ? seasonNumber ?? historyEpisode?.season ?? 1 : null;
    const effectiveEpisode = isTv ? episodeNumber ?? historyEpisode?.episode ?? 1 : null;
    const episodeDuration = isTv && "episodeRunTime" in details && details.episodeRunTime?.[0]
      ? formatRuntime(details.episodeRunTime[0])
      : undefined;
    const movieDuration = !isTv && "runtime" in details && details.runtime
      ? formatRuntime(details.runtime)
      : undefined;
    const duration = episodeDuration ?? movieDuration ?? undefined;
    const releaseYear = details.releaseDate ? getYear(details.releaseDate) : undefined;
    const playerSubtitle = isTv
      ? `S${effectiveSeason} E${effectiveEpisode}`
      : releaseYear || undefined;

    return (
      <PlayerShell
        title={details.title}
        subtitle={playerSubtitle}
        media={{
          mediaType: details.mediaType,
          mediaId: details.id,
          imdbId: details.imdbId,
          title: details.title,
          posterPath: details.posterPath,
          backdropPath: details.backdropPath,
          seasonNumber: effectiveSeason,
          episodeNumber: effectiveEpisode,
          duration,
          runtime: isTv
            ? ("episodeRunTime" in details ? details.episodeRunTime?.[0] ?? null : null)
            : ("runtime" in details ? details.runtime ?? null : null),
          releaseYear,
          seasons: isTv && "seasons" in details ? toPlayerSeasons(details.seasons) : undefined,
          initialEpisodes,
        }}
        onBack={() => router.push(getMediaHref(details.mediaType, details.id))}
        onNavigateEpisode={(season: number, episode: number) =>
          router.push(getEpisodeHref(details.id, season, episode))
        }
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white overflow-x-hidden">
      {!isModal && !isPageReady ? <PageLoader /> : null}

      {/* Fixed Ambient Background (matches Cinejoy) */}
      {!isModal && heroBackdrop ? (
        <div
          className="fixed inset-0 z-0 pointer-events-none bg-[#050505]"
          style={{ contain: "strict", willChange: "transform" }}
        >
          <div className="absolute inset-0 w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="w-full h-full object-cover scale-[1.2] blur-[80px] saturate-100 opacity-50"
              alt={`${details.title} ambient background`}
              src={heroBackdrop}
            />
            <div className="absolute top-0 left-0 w-full h-[40vh] mix-blend-screen opacity-20 hidden lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-full object-cover scale-[1.2] blur-[50px] saturate-100"
                alt={`${details.title} backdrop glow`}
                style={{
                  maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
                }}
                src={heroBackdrop}
              />
            </div>
            {/* Dark gradient overlay under hero section */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(5, 5, 5, 0.75) 60%, #050505 100%)",
              }}
            />
          </div>
        </div>
      ) : null}

      {!isModal ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 px-6 py-5 md:px-8 md:py-6">
          <Link
            href="/"
            aria-label="Go back"
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-text-hi backdrop-blur-xl transition-all duration-200 hover:border-white/20 hover:scale-105"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
        </div>
      ) : null}

      {/* Hero Backdrop Section */}
      <div className="relative w-full">
        <div
          className={`relative w-full overflow-hidden ${
            isModal ? "h-[50vh] md:h-[60vh]" : "h-[65vh] lg:h-[75vh]"
          }`}
          style={{
            maskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 98%)",
          }}
        >
          {mobile ? (
            <picture className="h-full w-full block">
              {desktopSrcSet ? (
                <source media="(min-width: 960px)" srcSet={desktopSrcSet} sizes="100vw" />
              ) : desktop ? (
                <source media="(min-width: 960px)" srcSet={desktop} />
              ) : null}
              {tablet ? <source media="(min-width: 600px)" srcSet={tablet} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mobile}
                alt={`${details.title} backdrop`}
                className="h-full w-full object-cover object-top"
              />
            </picture>
          ) : heroBackdrop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroBackdrop}
              alt={`${details.title} backdrop`}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div className="h-full w-full bg-surface-1" />
          )}

          {directTrailerUrl && showTrailer && isTrailerEnabled ? (
            <div
              className="absolute inset-0 w-full overflow-hidden transition-opacity duration-700 ease-in-out"
              style={{ opacity: trailerReady ? 1 : 0 }}
            >
              <video
                ref={videoRef}
                src={directTrailerUrl}
                autoPlay
                muted={isMuted}
                playsInline
                preload="auto"
                onCanPlay={() => setTrailerReady(true)}
                onEnded={() => {
                  setShowTrailer(false);
                  setTrailerReady(false);
                }}
                className="h-full w-full object-cover object-top pointer-events-none"
              />
            </div>
          ) : null}

          {/* Gradients matching Cinejoy */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent pointer-events-none hidden lg:block" />
        </div>

        {directTrailerUrl && showTrailer && trailerReady && isTrailerEnabled ? (
          <button
            type="button"
            onClick={() => {
              setIsMuted((prev) => {
                const next = !prev;
                if (videoRef.current) {
                  videoRef.current.muted = next;
                }
                return next;
              });
            }}
            aria-label={isMuted ? "Unmute trailer" : "Mute trailer"}
            className="absolute bottom-6 right-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-black/70 md:bottom-8 md:right-8 cursor-pointer"
          >
            {isMuted ? (
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
                aria-hidden="true"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
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
                aria-hidden="true"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        ) : null}

        {/* Content Info Section */}
        <div
          className={`relative z-20 ${
            isModal
              ? "-mt-32 md:-mt-40 px-6 pb-8 md:px-10"
              : "-mt-44 lg:-mt-[22rem] lg:flex lg:items-start lg:justify-between lg:gap-10 px-6 lg:px-16"
          }`}
        >
          <div className="w-full max-w-[700px] lg:max-w-[650px] lg:min-w-0 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Title / Logo */}
            {details.logoPath && settings.appearance.useImageLogos ? (
              <div className="mb-2 max-w-[280px] sm:max-w-[340px] md:max-w-[420px]">
                <h1 className="sr-only">{details.title}</h1>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getLogoUrl(details.logoPath) ?? undefined}
                  alt={details.title}
                  className="max-h-20 lg:max-h-36 max-w-[75%] lg:max-w-[500px] object-contain drop-shadow-2xl"
                />
              </div>
            ) : (
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-2xl">
                {details.title}
              </h1>
            )}

            {/* Stats Line (Rating • Year • Runtime • Genres) */}
            <div className="mt-3 lg:mt-4 flex flex-wrap items-center gap-2 text-sm lg:text-base font-medium text-white/90 justify-center lg:justify-start">
              {details.voteAverage > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-white/90">
                  <span>★</span>
                  <span>{details.voteAverage.toFixed(1)}/10</span>
                </span>
              ) : null}

              {details.releaseDate ? (
                <span className="inline-flex items-center gap-2">
                  {details.voteAverage > 0 ? <span className="text-white/40 select-none">•</span> : null}
                  <span className="tabular-nums">{getYear(details.releaseDate)}</span>
                </span>
              ) : null}

              {/* Pre-Release Countdown Badge */}
              {details.releaseDate && new Date(details.releaseDate) > new Date() ? (() => {
                const diffDays = Math.ceil(
                  (new Date(details.releaseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-white/[0.14] to-white/[0.05] text-white/95 border border-white/20 backdrop-blur-md shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                    <span>{diffDays <= 1 ? "Releasing Tomorrow" : `Releases in ${diffDays} days`}</span>
                  </span>
                );
              })() : null}

              {"runtime" in details && details.runtime ? (
                <span className="inline-flex items-center gap-2">
                  <span className="text-white/40 select-none">•</span>
                  <span className="tabular-nums">{formatRuntime(details.runtime)}</span>
                </span>
              ) : null}

              {details.genres && details.genres.length > 0 ? (
                <>
                  {details.genres.map((genre) => (
                    <span key={genre.id} className="inline-flex items-center gap-2">
                      <span className="text-white/40 select-none">•</span>
                      <span>{genre.name}</span>
                    </span>
                  ))}
                </>
              ) : null}
            </div>

            {/* Action Buttons Row */}
            <div className="mt-5 lg:mt-6 flex items-center gap-3 flex-wrap justify-center lg:justify-start">
              {historyEntry ? (() => {
                const totalMinutes = isTv
                  ? ("episodeRunTime" in details && details.episodeRunTime?.[0]
                      ? details.episodeRunTime[0]
                      : historyEntry.duration)
                  : ("runtime" in details && details.runtime
                      ? details.runtime
                      : historyEntry.duration);

                const resumeSeconds = calculateResumeSeconds(historyEntry.progress, totalMinutes);
                const resumeLabel = resumeSeconds > 0
                  ? `Resume at ${formatPlaybackTime(resumeSeconds)}`
                  : `Resume${historyEntry.progress ? ` (${historyEntry.progress}%)` : ""}`;

                const resumeHref = isTv
                  ? getEpisodeHref(
                      details.id,
                      historyEntry.seasonNumber ?? historyEpisode?.season ?? 1,
                      historyEntry.episodeNumber ?? historyEpisode?.episode ?? 1,
                      resumeSeconds
                    )
                  : getPlayHref(
                      details.mediaType,
                      details.id,
                      resumeSeconds
                    );

                return (
                  <PlayButton
                    href={resumeHref}
                    onClick={onClose}
                    size="md"
                    label={resumeLabel}
                  />
                );
              })() : null}

              {historyEntry ? (
                <Link
                  href={
                    isTv
                      ? getEpisodeHref(
                          details.id,
                          seasonNumber ?? historyEpisode?.season ?? 1,
                          episodeNumber ?? historyEpisode?.episode ?? 1
                        )
                      : getPlayHref(details.mediaType, details.id)
                  }
                  onClick={onClose}
                  className="flex h-[44px] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 text-sm font-semibold tracking-wide text-white backdrop-blur-[20px] shadow-lg shadow-black/5 transition-all duration-200 hover:scale-105 hover:border-white/20 active:scale-95"
                >
                  <PlayIcon size={18} className="fill-current text-white shrink-0" />
                  <span>Start Over</span>
                </Link>
              ) : (
                <PlayButton
                  href={
                    isTv
                      ? getEpisodeHref(
                          details.id,
                          seasonNumber ?? historyEpisode?.season ?? 1,
                          episodeNumber ?? historyEpisode?.episode ?? 1
                        )
                      : getPlayHref(details.mediaType, details.id)
                  }
                  onClick={onClose}
                  size="md"
                  label="Play"
                />
              )}

              {/* Add to Watchlist button */}
              <button
                type="button"
                aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                aria-pressed={inWatchlist}
                onClick={handleWatchlist}
                disabled={isWatchlistLoading}
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-[20px] shadow-lg shadow-black/5 transition-all duration-200 hover:scale-105 hover:border-white/20 active:scale-95 focus:outline-none disabled:opacity-50"
              >
                {inWatchlist ? (
                  <CheckIcon size={19} className="stroke-[2.5]" />
                ) : (
                  <PlusIcon size={19} className="stroke-[2]" />
                )}
              </button>

              {/* Share button */}
              <ShareButton
                title={details.title}
                text={details.overview}
                url={getMediaHref(details.mediaType, details.id, details.title)}
                onToast={showToast}
              />

              {isTv ? (
                <a
                  href="#episodes-section"
                  className="flex h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-[13px] font-semibold text-white backdrop-blur-[20px] shadow-lg shadow-black/5 transition-all duration-200 hover:scale-105 hover:border-white/20 active:scale-95"
                >
                  <ListOrderedIcon size={16} />
                  <span>Episodes</span>
                </a>
              ) : null}

              <a
                href="#recommendations-section"
                className="flex h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-[13px] font-semibold text-white backdrop-blur-[20px] shadow-lg shadow-black/5 transition-all duration-200 hover:scale-105 hover:border-white/20 active:scale-95"
              >
                <SparklesIcon size={16} />
                <span>Similars</span>
              </a>
            </div>

            {/* Overview Description */}
            {details.overview ? (
              <div className="mt-5 lg:mt-6 w-full">
                <p className="text-sm lg:text-base text-white/70 leading-relaxed line-clamp-3 lg:line-clamp-4">
                  {details.overview}
                </p>
              </div>
            ) : null}

            {/* Mobile Meta Details Box (Runtime, Language, Release Date) */}
            <div className="mt-6 w-full lg:hidden">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden">
                <div className="divide-y divide-white/[0.06]">
                  {"runtime" in details && details.runtime ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="text-xs text-white/40">Runtime</span>
                      <span className="text-xs text-white/80">{formatRuntime(details.runtime)}</span>
                    </div>
                  ) : null}
                  {details.originalLanguage ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="text-xs text-white/40">Language</span>
                      <span className="text-xs text-white/80 uppercase">{details.originalLanguage}</span>
                    </div>
                  ) : null}
                  {details.releaseDate ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <span className="text-xs text-white/40">Release Date</span>
                      <span className="text-xs text-white/80">
                        {new Date(details.releaseDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Right Meta Card */}
          {!isModal ? (
            <div className="hidden lg:block w-[280px] shrink-0 mt-36 xl:mt-40">
              <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-hidden backdrop-blur-sm">
                <div className="divide-y divide-white/[0.06]">
                  {"runtime" in details && details.runtime ? (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-white/40">Runtime</span>
                      <span className="text-xs text-white/80">{formatRuntime(details.runtime)}</span>
                    </div>
                  ) : null}
                  {details.originalLanguage ? (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-white/40">Language</span>
                      <span className="text-xs text-white/80 uppercase">{details.originalLanguage}</span>
                    </div>
                  ) : null}
                  {details.releaseDate ? (
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs text-white/40">Release Date</span>
                      <span className="text-xs text-white/80">
                        {new Date(details.releaseDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Lower Section (Cast, Episodes, Recommendations) */}
      <div
        className={`relative z-20 ${
          isModal
            ? "px-6 pb-8 md:px-10 md:pb-12"
            : "mt-10 lg:mt-14 px-6 lg:px-16 space-y-10 lg:space-y-14 pb-16"
        }`}
      >
        {isTv && "seasons" in details ? (
          <EpisodesSection
            tvId={details.id}
            seasons={details.seasons}
            initialEpisodes={initialEpisodes}
            onReady={handleEpisodeReady}
          />
        ) : null}
        <div>
          <CastRow cast={details.cast} />
        </div>
        <div className="my-6">
          <NativeBannerAd id={isModal ? "container-7f39a089ecb822ed1c9d27240135d8fd-modal" : "container-7f39a089ecb822ed1c9d27240135d8fd"} />
        </div>
        <div id="recommendations-section" className="scroll-mt-24">
          <RecommendationsRow
            title="You may like"
            items={
              details.similar.length > 0 ? details.similar : details.recommendations
            }
          />
        </div>
        <div className="my-6">
          <DisplayBannerAd />
        </div>
      </div>
    </div>
  );
}
