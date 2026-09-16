import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-20 mt-auto w-full px-6 pt-24 pb-28 sm:pt-28 md:pt-36 lg:px-16 lg:pb-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/"
            className="group relative flex items-center justify-center"
            aria-label="Cineby Home"
          >
            <div className="relative z-10 flex items-center gap-2.5 transition-transform duration-300 group-hover:scale-110">
              <picture>
                <img
                  src="/logo.png"
                  alt="Cineby"
                  width={36}
                  height={36}
                  draggable={false}
                  decoding="async"
                  className="h-8 w-8 select-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] md:h-9 md:w-9"
                />
              </picture>
              <span className="text-xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] md:text-2xl">
                Cineby
              </span>
            </div>
          </Link>

          <p className="max-w-lg text-center text-xs leading-relaxed text-white/40">
            Cineby does not host, store, or distribute any media files. All content is sourced from third-party providers.
          </p>

          <a
            href="mailto:contact@cineby.at"
            className="text-xs text-white/30 underline underline-offset-2 transition-colors duration-200 hover:text-white/60"
          >
            contact@cineby.at
          </a>
        </div>
      </div>
    </footer>
  );
}

