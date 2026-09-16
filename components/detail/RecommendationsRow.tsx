import type { MediaSummary } from "@/lib/tmdb";
import { getMediaHref, getMediaTypeLabel, getYear } from "@/lib/utils/media";

import { MediaPosterCard } from "@/components/movie/MediaPosterCard";

interface RecommendationsRowProps {
  title: string;
  items: MediaSummary[];
}

export function RecommendationsRow({ title, items }: RecommendationsRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="heading-trail mb-6 text-xl font-semibold text-text-hi md:text-2xl">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => (
          <MediaPosterCard
            key={item.id}
            title={item.title}
            posterPath={item.posterPath}
            href={getMediaHref(item.mediaType, item.id)}
            mediaType={item.mediaType}
            mediaId={item.id}
            rating={item.voteAverage}
            year={getYear(item.releaseDate)}
            typeLabel={getMediaTypeLabel(item.mediaType)}
          />
        ))}
      </div>
    </div>
  );
}
