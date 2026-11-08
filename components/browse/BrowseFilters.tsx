import type { Genre } from "@/lib/tmdb";

export type SortKey = "popular" | "rating" | "recent";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "rating", label: "Top rated" },
  { key: "recent", label: "Newest" },
];

interface BrowseFiltersProps {
  genres: Genre[];
  sortKey: SortKey;
  genreId?: number;
  onSortChange: (sortKey: SortKey) => void;
  onGenreChange: (genreId: number) => void;
}

/**
 * Sort as a segmented control, genres as chips. On phones the chips scroll sideways in one row; from md up they
 * wrap, so every genre is visible without a menu.
 */
export function BrowseFilters({ genres, sortKey, genreId, onSortChange, onGenreChange }: BrowseFiltersProps) {
  return (
    <div className="mb-6 space-y-3 md:space-y-4">
      <div role="group" aria-label="Sort by" className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.05] p-1 md:inline-grid">
        {SORT_OPTIONS.map((option) => (
          <FilterButton
            key={option.key}
            label={option.label}
            isActive={genreId === undefined && sortKey === option.key}
            className="rounded-lg px-4 py-2"
            onClick={() => onSortChange(option.key)}
          />
        ))}
      </div>

      <div
        role="group"
        aria-label="Genres"
        className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:-mx-4 sm:px-4 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
      >
        {genres.map((genre) => (
          <FilterButton
            key={genre.id}
            label={genre.name}
            isActive={genreId === genre.id}
            className="shrink-0 rounded-full border border-white/10 px-3.5 py-1.5"
            onClick={() => onGenreChange(genre.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  isActive: boolean;
  className: string;
  onClick: () => void;
}

function FilterButton({ label, isActive, className, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`whitespace-nowrap text-[13px] font-medium transition-colors duration-200 ${className} ${
        isActive
          ? "bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary-glow)]"
          : "bg-white/[0.04] text-gray-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
