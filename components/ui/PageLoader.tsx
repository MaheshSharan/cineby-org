interface PageLoaderProps {
  className?: string;
  fullScreen?: boolean;
}

export function PageLoader({ className = "", fullScreen = true }: PageLoaderProps) {
  const containerClasses = fullScreen
    ? `fixed inset-0 z-[100] flex items-center justify-center bg-neo-bg ${className}`
    : `flex items-center justify-center min-h-[440px] w-full bg-neo-bg ${className}`;

  return (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary/40 [animation-duration:0.9s]" />
        <picture>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/cineby-logo.png"
            alt="Cineby Loading"
            title="Cineby"
            width={28}
            height={28}
            className="h-7 w-7 object-contain opacity-80"
          />
        </picture>
      </div>
    </div>
  );
}