import Link from "next/link";
import { SineRibbons } from "@/components/ui/SineRibbons";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-20 mt-auto w-full border-t border-white/[0.08] px-4 pt-16 pb-20 sm:pt-20 sm:pb-12 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* Main visual brand with dynamic Sine Ribbons clipped inside text */}
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            className="group relative inline-block select-none transition-transform duration-300 hover:scale-[1.02]"
            aria-label="Cineby Home"
          >
            {/* The wrapper sets the exact shape and clips the inner canvas using mix-blend-mode */}
            <div className="relative inline-block overflow-hidden">
              <SineRibbons />
              <h2
                className="relative text-6xl font-black uppercase tracking-tight sm:text-8xl md:text-9xl lg:text-[11rem] leading-none text-black bg-white mix-blend-multiply pointer-events-none select-none"
              >
                CINEBY
              </h2>
            </div>
          </Link>

          {/* Description */}
          <p className="mt-4 max-w-2xl text-xs sm:text-sm font-normal leading-relaxed text-white/50 px-2">
            Cineby is an open media discovery and personal entertainment tracking platform. Browse trending movies,
            top-rated TV series, explore titles by streaming provider, and manage personal watchlists and multi-user viewing profiles.
          </p>
        </div>

        {/* Bottom bar with Links and concise copyright & disclaimer on a single clean line */}
        <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Navigation Links */}
          <nav className="flex items-center gap-6 font-semibold uppercase tracking-wider text-white/60">
            <Link
              href="/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-white"
            >
              Terms of Service
            </Link>
            <a
              href="mailto:maheshsharan28@gmail.com"
              className="transition-colors hover:text-white"
            >
              Contact
            </a>
          </nav>

          {/* Single-line concise copyright and disclaimer */}
          <div className="text-white/40 text-center sm:text-right whitespace-nowrap text-[11px] sm:text-xs">
            <span>© {currentYear} Cineby. Non-hosting provider index. All metadata via TMDB.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
