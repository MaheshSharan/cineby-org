import Link from "next/link";

import type { MediaSummary } from "@/lib/tmdb";
import { getBackdropResponsiveUrls, getPosterResponsiveUrls } from "@/lib/tmdb/image";
import { getMediaHref, getMediaTypeLabel, getYear } from "@/lib/utils/media";
import { useSettings } from "@/hooks/useSettings";
import { useDetailModal } from "@/components/detail/DetailModalContext";

import { MediaPosterCard } from "@/components/movie/MediaPosterCard";
import { StarIcon } from "@/components/ui/icons";

type CardVariant = "poster" | "backdrop" | "grid" | "catalog";

const VARIANT_WIDTH: Record<CardVariant, string> = {
  poster: "w-[140px] xs:w-[150px] md:w-[180px] lg:w-[200px] flex-shrink-0",
  backdrop: "w-[240px] xs:w-[260px] md:w-[280px] lg:w-[320px] flex-shrink-0",
  grid: "w-full",
  catalog: "w-[120px] xs:w-[132px] sm:w-[150px] md:w-[170px] lg:w-[188px] flex-shrink-0",
};

interface MovieCardProps {
  media: MediaSummary;
  variant?: CardVariant;
  rank?: number;
  className?: string;
}

export function MovieCard({ media, variant = "poster", rank, className = "" }: MovieCardProps) {
  const { settings } = useSettings();
  const { openDetailModal } = useDetailModal();
  const isModalDetail = settings.appearance.detailViewType === "modal";

  const poster = getPosterResponsiveUrls(media.posterPath);
  const backdrop = getBackdropResponsiveUrls(media.backdropPath || media.posterPath);
  const href = getMediaHref(media.mediaType, media.id);
  const year = getYear(media.releaseDate);
  const typeLabel = getMediaTypeLabel(media.mediaType);
  const widthClass = VARIANT_WIDTH[variant];

  const isBackdrop = variant === "backdrop";

  const handleCardClick = (e: React.MouseEvent) => {
    if (isModalDetail) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      openDetailModal({ mediaType: media.mediaType, id: media.id });
    }
  };

  if (variant === "catalog") {
    return (
      <MediaPosterCard
        title={media.title}
        posterPath={media.posterPath}
        href={href}
        mediaType={media.mediaType}
        mediaId={media.id}
        onClick={handleCardClick}
        rating={media.voteAverage}
        year={year}
        typeLabel={typeLabel}
        className="w-[120px] xs:w-[132px] sm:w-[150px] md:w-[170px] lg:w-[188px] flex-shrink-0 snap-start"
      />
    );
  }

  return (
    <div className={`group ${widthClass} snap-start ${className}`}>
      <div className="media-card media-card-vertical w-full">
        <Link
          href={href}
          onClick={handleCardClick}
          aria-label={media.title}
          className="block rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
        >
          <div
            className={`relative w-full overflow-hidden rounded-[10px] border border-white/10 bg-surface-1 transition-all duration-normal ease-out group-hover:border-white/20 ${
              isBackdrop ? "aspect-[16/9]" : "aspect-[2/3]"
            }`}
          >
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#05070a]/[0.92] via-[#05070a]/30 to-transparent opacity-0 transition-opacity duration-normal group-hover:opacity-100" />

            {isBackdrop ? (
              backdrop.mobile ? (
                <picture>
                  {backdrop.desktop ? (
                    <source media="(min-width: 768px)" srcSet={backdrop.desktop} />
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={backdrop.mobile}
                    alt={media.title}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/9] h-full w-full object-cover object-center transition-transform duration-normal ease-out group-hover:scale-[1.03]"
                  />
                </picture>
              ) : (
                <div className="flex aspect-[16/9] h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium text-text-mid">
                  {media.title}
                </div>
              )
            ) : poster.mobile ? (
              <picture>
                {poster.desktop ? <source media="(min-width: 768px)" srcSet={poster.desktop} /> : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={poster.mobile}
                  alt={media.title}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[2/3] h-full w-full object-cover object-top transition-transform duration-normal ease-out group-hover:scale-[1.03]"
                />
              </picture>
            ) : (
              <div className="flex aspect-[2/3] h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium text-text-mid">
                {media.title}
              </div>
            )}

            {rank ? (
              <div
                aria-hidden="true"
                className="absolute left-0 top-0 z-[15] flex flex-col items-center justify-center overflow-hidden bg-primary font-bold text-white shadow-[0_4px_10px_var(--accent-glow)]"
                style={{
                  width: "30px",
                  height: "38px",
                  padding: "5px 2px 7px",
                  clipPath: "polygon(0px 0px, 100% 0px, 100% 100%, 50% 85%, 0px 100%)",
                }}
              >
                <span className="text-[9px] uppercase leading-tight tracking-wide">Top</span>
                <span className="-mt-0.5 text-[11px] tabular-nums leading-none">
                  {String(rank).padStart(2, "0")}
                </span>
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#05070a]/[0.96] via-[#05070a]/35 to-transparent opacity-0 transition-opacity duration-normal group-hover:opacity-100" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-12 text-left opacity-0 transition-opacity duration-normal group-hover:opacity-100">
              <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{media.title}</h3>
              <div className="mt-1.5 flex items-center gap-1.5 truncate text-[10px] leading-none text-white/75">
                {media.voteAverage > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <StarIcon size={10} className="fill-primary text-primary" />
                    <span className="tabular-nums text-white/90">{media.voteAverage.toFixed(1)}</span>
                  </span>
                ) : null}
                {year ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="text-white/30">·</span>
                    <span className="tabular-nums">{year}</span>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="text-white/30">·</span>
                  <span>{typeLabel}</span>
                </span>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-normal group-hover:opacity-100">
              <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white text-[#05070a] shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform duration-normal group-hover:scale-100">
                <svg className="ml-0.5 h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.14v13.72c0 .78.86 1.26 1.53.85l10.86-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
