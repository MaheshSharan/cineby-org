import Link from "next/link";
import { useRouter } from "next/router";

import { useAuth } from "@/components/auth/AuthProvider";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import {
  ClapperboardIcon,
  HomeIcon,
  LogInIcon,
  SearchIcon,
  TvIcon,
} from "@/components/ui/icons";

interface DockProps {
  onOpenSearch: () => void;
  onOpenAccount: () => void;
  isAccountOpen?: boolean;
}

export function Dock({ onOpenSearch, onOpenAccount, isAccountOpen = false }: DockProps) {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();
  const { activeProfile } = useActiveProfile();

  const pathname = router.pathname;
  const isHome = pathname === "/";
  const isMovies = pathname.startsWith("/browse/movie") || pathname.startsWith("/movie");
  const isTv = pathname.startsWith("/browse/tv") || pathname.startsWith("/tv");
  const isAccount =
    isAccountOpen ||
    pathname.startsWith("/profiles") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/watchlist");

  const handleAccountClick = () => {
    if (user) {
      onOpenAccount();
    } else {
      openAuthModal("login");
    }
  };

  const navButtonBase =
    "group relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 select-none touch-manipulation active:scale-[0.88] hover:scale-105";

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="md:hidden fixed bottom-3 inset-x-3 mx-auto w-auto max-w-[380px] z-40 rounded-2xl border border-white/[0.12] bg-[#07090e]/85 backdrop-blur-2xl backdrop-saturate-150 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.12)]"
      style={{
        paddingBottom: "max(0.375rem, env(safe-area-inset-bottom, 0px))",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className="grid grid-cols-5 items-center gap-1">
        {/* Home */}
        <Link
          href="/"
          className={`${navButtonBase} ${
            isHome
              ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              : "text-white/50 hover:text-white/85 hover:bg-white/[0.04]"
          }`}
          aria-label="Home"
          aria-current={isHome ? "page" : undefined}
        >
          <div className="relative flex items-center justify-center">
            <HomeIcon
              size={20}
              strokeWidth={isHome ? 2.2 : 1.8}
              className={`transition-transform duration-200 ${
                isHome ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] scale-105" : ""
              }`}
            />
            {isHome && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent-hi shadow-[0_0_8px_#f87171]" />
            )}
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none transition-colors duration-200 ${
              isHome ? "font-semibold text-white" : "font-medium text-white/50"
            }`}
          >
            Home
          </span>
        </Link>

        {/* Movies */}
        <Link
          href="/browse/movie"
          className={`${navButtonBase} ${
            isMovies
              ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              : "text-white/50 hover:text-white/85 hover:bg-white/[0.04]"
          }`}
          aria-label="Movies"
          aria-current={isMovies ? "page" : undefined}
        >
          <div className="relative flex items-center justify-center">
            <ClapperboardIcon
              size={20}
              strokeWidth={isMovies ? 2.2 : 1.8}
              className={`transition-transform duration-200 ${
                isMovies ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] scale-105" : ""
              }`}
            />
            {isMovies && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent-hi shadow-[0_0_8px_#f87171]" />
            )}
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none transition-colors duration-200 ${
              isMovies ? "font-semibold text-white" : "font-medium text-white/50"
            }`}
          >
            Movies
          </span>
        </Link>

        {/* TV Shows */}
        <Link
          href="/browse/tv"
          className={`${navButtonBase} ${
            isTv
              ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              : "text-white/50 hover:text-white/85 hover:bg-white/[0.04]"
          }`}
          aria-label="TV Shows"
          aria-current={isTv ? "page" : undefined}
        >
          <div className="relative flex items-center justify-center">
            <TvIcon
              size={20}
              strokeWidth={isTv ? 2.2 : 1.8}
              className={`transition-transform duration-200 ${
                isTv ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] scale-105" : ""
              }`}
            />
            {isTv && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent-hi shadow-[0_0_8px_#f87171]" />
            )}
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none transition-colors duration-200 ${
              isTv ? "font-semibold text-white" : "font-medium text-white/50"
            }`}
          >
            TV Series
          </span>
        </Link>

        {/* Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className={`${navButtonBase} text-white/50 hover:text-white/85 hover:bg-white/[0.04]`}
          aria-label="Search"
        >
          <div className="relative flex items-center justify-center">
            <SearchIcon size={20} strokeWidth={1.8} className="transition-transform duration-200 group-hover:scale-105" />
          </div>
          <span className="mt-1 text-[10px] font-medium tracking-tight leading-none text-white/50">
            Search
          </span>
        </button>

        {/* Account / Profile */}
        <button
          type="button"
          onClick={handleAccountClick}
          className={`${navButtonBase} ${
            isAccount
              ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
              : "text-white/50 hover:text-white/85 hover:bg-white/[0.04]"
          }`}
          aria-label={user ? "My account" : "Log in"}
          aria-haspopup="true"
          aria-expanded={isAccountOpen}
        >
          <div className="relative flex items-center justify-center">
            {user ? (
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all duration-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeProfile?.avatarUrl || user.avatarUrl || "/avatar/classic-1.png"}
                  alt={activeProfile?.name || user.displayName || user.email}
                  className="h-full w-full object-cover"
                />
              </span>
            ) : (
              <LogInIcon
                size={20}
                strokeWidth={isAccount ? 2.2 : 1.8}
                className={isAccount ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]" : ""}
              />
            )}
            {isAccount && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent-hi shadow-[0_0_8px_#f87171]" />
            )}
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none transition-colors duration-200 ${
              isAccount ? "font-semibold text-white" : "font-medium text-white/50"
            }`}
          >
            {user ? (activeProfile?.name ? activeProfile.name.split(" ")[0] : "You") : "Log In"}
          </span>
        </button>
      </div>
    </nav>
  );
}
