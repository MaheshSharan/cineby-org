import { usePageLoadProgress } from "@/hooks/usePageLoadProgress";

export function PageLoadBar() {
  const { isVisible, progress, run } = usePageLoadProgress();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-[100] h-[3px] w-full transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        key={run}
        className="h-full bg-primary shadow-[0_0_10px_var(--primary-glow)] transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
