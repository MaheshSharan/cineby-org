import Link from "next/link";
import type { ReactNode } from "react";

import { getBackdropResponsiveUrls, getPosterResponsiveUrls } from "@/lib/tmdb/image";

import { ClockIcon, StarIcon } from "@/components/ui/icons";

type MediaPosterCardMode = "poster" | "continue";

interface MediaPosterCardProps {
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  href: string;
  subtitle?: ReactNode;
  rating?: number;
  year?: string;
  typeLabel?: string;
  progress?: number | null;
  duration?: string | null;
  infoHref?: string;
  actions?: ReactNode;
  mode?: MediaPosterCardMode;
  className?: string;
}

export function MediaPosterCard({
  title,
  posterPath,
  backdropPath,
  href,
  subtitle,
  rating,
  year,
  typeLabel,
  progress,
  duration,
  infoHref,
  actions,
  mode = "poster",
  className = "",
}: MediaPosterCardProps) {
  const isContinue = mode === "continue";
  const poster = getPosterResponsiveUrls(posterPath);
  const backdrop = getBackdropResponsiveUrls(backdropPath ?? posterPath);
  const progressValue = progress == null ? 0 : Math.min(100, Math.max(0, progress));

  const metadata = (
    <div className="flex items-center gap-1.5 truncate text-[10px] leading-none text-white/75">
      {rating != null ? (
        <span className="inline-flex items-center gap-1">
          <StarIcon size={10} className="fill-primary text-primary" />
          <span className="tabular-nums text-white/90">{rating.toFixed(1)}</span>
        </span>
      ) : null}
      {year ? (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="text-white/30">·</span>
          <span className="tabular-nums">{year}</span>
        </span>
      ) : null}
      {typeLabel ? (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="text-white/30">·</span>
          <span>{typeLabel}</span>
        </span>
      ) : null}
      {subtitle ? <span className="truncate">{subtitle}</span> : null}
    </div>
  );

  if (isContinue) {
    return (
      <div className={`group relative w-60 md:w-72 flex-none snap-start transition-all duration-300 ease-out group-hover:z-30 ${className}`}>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1a1a1a] shadow-lg shadow-black/40 border border-white/5 transition-all duration-300 ease-out group-hover:scale-[1.06] group-hover:shadow-2xl group-hover:shadow-black/70 group-hover:border-white/10 active:scale-95 cursor-pointer">
          <Link
            href={href}
            aria-label={`Resume ${title}`}
            className="absolute inset-0 z-10 block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
          >
            {backdrop.mobile ? (
              <picture>
                {backdrop.desktop ? <source media="(min-width: 768px)" srcSet={backdrop.desktop} /> : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backdrop.mobile}
                  alt={title}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-cover"
                />
              </picture>
            ) : (
              <div
                className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-white/60"
                style={{ background: "linear-gradient(to right, #262626 0%, #30302e 100%)" }}
              >
                {title}
              </div>
            )}

            {/* Cinejoy Progress bar */}
            {progress != null ? (
              <div className="absolute bottom-0 left-0 right-0 z-20 h-[3px] bg-white/20">
                <div
                  className="h-full bg-white rounded-r-full transition-all duration-300"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            ) : null}
          </Link>

          {/* Smooth hover gradient */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />

          {/* Cinejoy Bottom Action Buttons Row */}
          <div className="absolute inset-x-0 bottom-3 z-30 flex items-center gap-2.5 px-3 opacity-0 translate-y-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
            {/* Play button */}
            <Link
              href={href}
              aria-label={`Resume ${title}`}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-all active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon lucide lucide-play w-5 h-5 fill-black ml-0.5" aria-hidden="true">
                <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
              </svg>
            </Link>

            {/* Action button (e.g. remove) */}
            {actions ? <div className="shrink-0">{actions}</div> : null}

            {/* Info button */}
            {infoHref ? (
              <Link
                href={infoHref}
                aria-label={`More info for ${title}`}
                title="More info"
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon lucide lucide-info w-5 h-5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Cinejoy Bottom text */}
        <div className="mt-2.5 px-0.5 transition-transform duration-300 ease-out group-hover:translate-y-1">
          <Link href={href} className="block focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded">
            <p className="text-sm font-medium text-white/90 truncate transition-colors duration-200 group-hover:text-white" title={title}>
              {title}
            </p>
          </Link>
          <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1 overflow-hidden">
            {subtitle ? (
              <>
                <span className="truncate">{subtitle}</span>
                <span className="shrink-0">·</span>
              </>
            ) : null}
            <ClockIcon size={12} className="shrink-0 text-white/50" />
            <span className="shrink-0">{duration || "In progress"}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
      <div className={`group relative flex min-w-0 flex-col ${className}`}>
      {actions ? <div className="absolute right-2 top-2 z-20">{actions}</div> : null}

      <Link
        href={href}
        aria-label={title}
        className="block rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-white/10 bg-surface-1 transition-all duration-normal ease-out group-hover:border-white/20">
          {poster.mobile ? (
            <picture>
              {poster.desktop ? <source media="(min-width: 768px)" srcSet={poster.desktop} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster.mobile}
                alt={title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-top transition-transform duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
              />
            </picture>
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium text-text-mid">
              {title}
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-[#05070a]/[0.96] via-[#05070a]/35 to-transparent opacity-0 transition-opacity duration-normal group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-12 text-left opacity-0 transition-opacity duration-normal group-hover:opacity-100">
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-white">{title}</h3>
            <div className="mt-1.5">{metadata}</div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-normal group-hover:opacity-100">
            <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-white text-[#05070a] shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform duration-normal group-hover:scale-100">
              <svg className="ml-0.5 h-5 w-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.14v13.72c0 .78.86 1.26 1.53.85l10.86-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
              </svg>
            </span>
          </div>

          {progress != null ? (
            <div className="absolute bottom-0 left-0 z-20 h-[3px] w-full bg-[#05070a]/60">
              <div className="h-full bg-gradient-to-r from-primary to-[#ff5252]" style={{ width: `${progressValue}%` }} />
            </div>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
