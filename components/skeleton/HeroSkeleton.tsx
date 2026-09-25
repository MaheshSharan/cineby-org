import { Skeleton } from "@/components/ui/Skeleton";

export function HeroSkeleton() {
  return (
    <div className="relative h-[80vh] min-h-[480px] w-full overflow-hidden bg-neo-bg md:h-[85vh]">
      {/* Background ambient skeleton */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Skeleton className="h-full w-full rounded-none bg-white/[0.04]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background:
              "linear-gradient(rgba(5, 7, 10, 0) 30%, rgba(5, 7, 10, 0.85) 75%, rgb(5, 7, 10) 100%), linear-gradient(90deg, rgba(5, 7, 10, 0.8) 0px, rgba(5, 7, 10, 0.4) 40%, rgba(5, 7, 10, 0) 65%)",
          }}
        />
      </div>

      {/* Hero content skeleton */}
      <div className="absolute inset-0 z-[3] flex items-end pb-16 md:pb-20">
        <div className="layout-container w-full">
          <div className="flex max-w-2xl flex-col gap-4">
            {/* Title / Logo skeleton */}
            <Skeleton className="h-10 w-3/4 max-w-[340px] rounded-lg bg-white/[0.09] md:h-14" />

            {/* Badges / metadata skeleton */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-12 rounded bg-white/[0.07]" />
              <Skeleton className="h-4 w-16 rounded bg-white/[0.07]" />
              <Skeleton className="h-4 w-20 rounded bg-white/[0.07]" />
            </div>

            {/* Overview paragraph skeleton */}
            <div className="flex flex-col gap-2 pt-1">
              <Skeleton className="h-4 w-full max-w-[540px] rounded bg-white/[0.06]" />
              <Skeleton className="h-4 w-4/5 max-w-[460px] rounded bg-white/[0.06]" />
              <Skeleton className="h-4 w-2/3 max-w-[380px] rounded bg-white/[0.06]" />
            </div>

            {/* Action buttons skeleton */}
            <div className="flex items-center gap-3 pt-2">
              <Skeleton className="h-11 w-28 rounded-full bg-white/[0.12] md:h-12 md:w-32" />
              <Skeleton className="h-11 w-32 rounded-full bg-white/[0.08] md:h-12 md:w-36" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
