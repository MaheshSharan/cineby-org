import { useMemo } from "react";

interface PaginationProps {
  page: number;
  pageCount: number;
  isDisabled?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, isDisabled = false, onPageChange }: PaginationProps) {
  const pageNumbers = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount]);

  if (pageCount <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-2 sm:justify-center">
      <PageButton label="Prev" isDisabled={isDisabled || page <= 1} onClick={() => onPageChange(page - 1)} />

      {/* Phones get a compact status; the full number row needs sm width. */}
      <span className="text-sm text-gray-400 sm:hidden" aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <div className="hidden items-center gap-2 sm:flex">
        {pageNumbers.map((number) => (
          <PageButton
            key={number}
            label={String(number)}
            isActive={number === page}
            isDisabled={isDisabled}
            onClick={() => onPageChange(number)}
          />
        ))}
      </div>

      <PageButton label="Next" isDisabled={isDisabled || page >= pageCount} onClick={() => onPageChange(page + 1)} />
    </nav>
  );
}

interface PageButtonProps {
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
}

function PageButton({ label, isActive = false, isDisabled = false, onClick }: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // The current page stays clickable-looking but does nothing; it must not be disabled or it greys out mid-load.
      disabled={isDisabled || isActive}
      aria-current={isActive ? "page" : undefined}
      className={`min-h-11 min-w-11 rounded-lg px-4 py-2 text-sm sm:min-h-9 sm:min-w-9 sm:px-3 sm:py-1.5 font-medium transition-colors duration-200 ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-white/[0.06] text-gray-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      }`}
    >
      {label}
    </button>
  );
}
