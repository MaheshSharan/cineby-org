interface AdProgressBarProps {
  progressPercent: number;
}

/** Yellow, non-seekable progress track shown instead of the seek bar while an ad plays. */
export function AdProgressBar({ progressPercent }: AdProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label="Ad progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPercent)}
      className="relative h-[3px] w-full rounded-full bg-white/25"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-yellow-400 transition-[width] duration-200 ease-linear"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
}
