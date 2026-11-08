import type { ReactNode } from "react";

// 2, 3, 4 and 6 columns: all divide 24, the browse page size, so rows are always full.
const MEDIA_GRID_CLASS =
  "grid grid-cols-2 gap-x-3 gap-y-7 xs:gap-x-4 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 md:grid-cols-4 xl:grid-cols-6 justify-items-center";

interface MediaGridProps {
  children: ReactNode;
  className?: string;
}

/** The poster grid shared by browse results and their loading skeleton, so both occupy the same space. */
export function MediaGrid({ children, className = "" }: MediaGridProps) {
  return <div className={`${MEDIA_GRID_CLASS} ${className}`}>{children}</div>;
}
