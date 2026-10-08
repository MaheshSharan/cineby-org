export function ProfileGridSkeleton() {
  return (
    <div className="flex w-full justify-center animate-in fade-in duration-300">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        {/* Title skeleton */}
        <div className="h-10 w-64 md:h-12 md:w-80 rounded-xl bg-white/[0.08] animate-pulse" />

        {/* Profiles avatars skeleton */}
        <div className="relative mt-10 flex flex-wrap items-start justify-center gap-6 md:mt-12 md:gap-8">
          {[1, 2, 3].map((id) => (
            <div key={id} className="flex w-24 flex-col items-center md:w-32">
              <div className="aspect-square w-full rounded-full border border-white/[0.08] bg-white/[0.05] animate-pulse" />
              <div className="mt-3.5 h-4 w-16 md:w-20 rounded-md bg-white/[0.05] animate-pulse" />
            </div>
          ))}
        </div>

        {/* Manage profiles button skeleton */}
        <div className="mt-12 flex items-center justify-center">
          <div className="h-10 w-36 rounded-full border border-white/[0.08] bg-white/[0.03] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
