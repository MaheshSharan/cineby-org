import { Skeleton } from "@/components/ui/Skeleton";

type SkeletonVariant = "row" | "grid" | "catalog";

interface SkeletonCardProps {
  variant?: SkeletonVariant;
  className?: string;
}

const VARIANT_WIDTHS: Record<SkeletonVariant, string> = {
  row: "w-36 sm:w-40",
  grid: "w-40 sm:w-44",
  catalog: "w-[120px] xs:w-[132px] sm:w-[150px] md:w-[170px] lg:w-[188px]",
};

export function SkeletonCard({ variant = "row", className = "" }: SkeletonCardProps) {
  return (
    <div className={`block ${variant === "grid" ? "w-full" : VARIANT_WIDTHS[variant]} ${className}`}>
      <Skeleton
        className={`w-full rounded-[10px] ${variant === "grid" ? "aspect-[16/9]" : "aspect-[2/3]"}`}
      />
    </div>
  );
}

export function SkeletonCardGrid() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <SkeletonCard key={index} variant="catalog" />
      ))}
    </div>
  );
}
