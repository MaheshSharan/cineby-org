import { CATALOG_CARD_WIDTH } from "@/components/movie/cardSizes";
import { MediaGrid } from "@/components/ui/MediaGrid";
import { Skeleton } from "@/components/ui/Skeleton";

type SkeletonVariant = "row" | "grid" | "catalog";

interface SkeletonCardProps {
  variant?: SkeletonVariant;
  className?: string;
}

const VARIANT_WIDTHS: Record<SkeletonVariant, string> = {
  row: "w-36 sm:w-40",
  grid: "w-40 sm:w-44",
  catalog: CATALOG_CARD_WIDTH,
};

export function SkeletonCard({ variant = "row", className = "" }: SkeletonCardProps) {
  return (
    <div className={`block ${variant === "grid" ? "w-full" : VARIANT_WIDTHS[variant]} ${className}`}>
      <Skeleton
        className={`w-full rounded-xl ${variant === "grid" ? "aspect-[16/9]" : "aspect-[2/3]"}`}
      />
    </div>
  );
}

interface SkeletonCardGridProps {
  count?: number;
  /** Use MediaGrid-shaped skeletons so a loading browse page matches the loaded one. */
  isMediaGrid?: boolean;
}

export function SkeletonCardGrid({ count = 12, isMediaGrid = false }: SkeletonCardGridProps) {
  const cards = Array.from({ length: count }).map((_, index) => <SkeletonCard key={index} variant="catalog" />);

  if (isMediaGrid) return <MediaGrid>{cards}</MediaGrid>;

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards}
    </div>
  );
}
