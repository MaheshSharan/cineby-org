import type { CastMember } from "@/lib/tmdb";
import { getProfileUrl } from "@/lib/tmdb/image";

const MAX_ACTORS = 7;

interface CastRowProps {
  cast: CastMember[];
}

export function CastRow({ cast }: CastRowProps) {
  if (cast.length === 0) {
    return null;
  }

  const visibleCast = cast.slice(0, MAX_ACTORS);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="heading-trail min-w-0 truncate text-xl font-semibold text-text-hi md:text-2xl">
          Actors
        </h2>
      </div>

      <div className="no-scrollbar flex gap-5 md:gap-6 overflow-x-auto overflow-y-visible py-2">
        {visibleCast.map((member) => (
          <div
            key={member.id}
            className="group flex w-28 md:w-32 flex-none flex-col items-center gap-3 text-center transition-transform duration-200"
          >
            <div className="relative h-24 w-24 md:h-28 md:w-28 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:border-white/30 group-hover:shadow-xl group-hover:shadow-black/60">
              {member.profilePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getProfileUrl(member.profilePath) ?? undefined}
                  alt={member.name}
                  title={member.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:brightness-110"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/10 text-xl font-bold text-text-hi">
                  {member.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="space-y-0.5 px-0.5 transition-transform duration-300 group-hover:translate-y-0.5">
              <p className="line-clamp-1 text-sm font-medium text-white/90 transition-colors duration-200 group-hover:text-white">
                {member.name}
              </p>
              {member.character ? (
                <p className="line-clamp-1 text-xs text-white/50 transition-colors duration-200 group-hover:text-white/70">
                  {member.character}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}