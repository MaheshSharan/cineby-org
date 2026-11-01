import React, { useEffect, useRef } from "react";
import Image from "next/image";
import { ADGUARD_CHROME_STORE_URL } from "../types";

export { ADGUARD_CHROME_STORE_URL };

interface AdBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdBlockModal({ isOpen, onClose }: AdBlockModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      closeButtonRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Modal Container: Mobile-first responsive (bottom sheet style on small screens, centered modal on desktop) */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adblock-modal-title"
        className="relative z-10 w-full max-w-[780px] max-h-[92vh] sm:max-h-[min(620px,90vh)] rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#161619] shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 overflow-hidden flex flex-col md:grid md:grid-cols-[290px_1fr] my-0 sm:my-auto"
      >
        {/* Left Column: Anime Visual & Value Badges (compact on mobile, full height on md+) */}
        <div className="relative h-32 sm:h-40 md:h-full md:min-h-0 flex flex-col justify-end p-3.5 sm:p-4 md:p-5 overflow-hidden bg-[#111113] flex-shrink-0">
          {/* Background Anime Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/assets/modal_left_anime.webp"
              alt="AdBlock Visual"
              fill
              priority
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 290px"
            />
            {/* Bottom gradient overlay to contrast the 3 feature pills */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111113] via-[#111113]/60 to-transparent" />
          </div>

          {/* Bottom 3 Feature Badges */}
          <div className="relative z-10 grid grid-cols-3 gap-1.5 text-center">
            {/* No disruptive ads */}
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-white/[0.12] backdrop-blur-md border border-white/10 text-white shadow-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
              <span className="text-[9.5px] md:text-[10.5px] font-medium text-white/90 mt-1 leading-tight">
                No disruptive<br />ads
              </span>
            </div>

            {/* No popups */}
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-white/[0.12] backdrop-blur-md border border-white/10 text-white shadow-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-[9.5px] md:text-[10.5px] font-medium text-white/90 mt-1 leading-tight">
                No popups
              </span>
            </div>

            {/* More privacy */}
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 items-center justify-center rounded-lg md:rounded-xl bg-white/[0.12] backdrop-blur-md border border-white/10 text-white shadow-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span className="text-[9.5px] md:text-[10.5px] font-medium text-white/90 mt-1 leading-tight">
                More privacy
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Content & Options */}
        <div className="relative p-4 sm:p-5 md:p-6 flex flex-col justify-between bg-[#161619] text-left overflow-y-auto min-h-0">
          {/* Top Close Button */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close AdBlock modal"
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/60 hover:text-white transition-all cursor-pointer border border-white/5 z-20"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Header Content */}
          <div className="pr-8">
            {/* Category Pill Tag */}
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/5 text-[9px] sm:text-[9.5px] md:text-[10px] font-semibold tracking-wider uppercase text-white/60">
              For a better viewing experience
            </div>

            {/* Main Headline */}
            <h2
              id="adblock-modal-title"
              className="mt-2 text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight leading-tight"
            >
              Block ads. Stop popups.<br />
              <span className="text-white">Just watch.</span>
            </h2>

            {/* Subtitle description */}
            <p className="mt-1 text-[11.5px] sm:text-xs text-white/55 leading-relaxed">
              To keep your stream smooth and uninterrupted, please use one of the recommended ad blockers.
            </p>
          </div>

          {/* AdBlock Options List */}
          <div className="mt-3 space-y-2">
            {/* Option 1: AdGuard */}
            <a
              href={ADGUARD_CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-2.5 md:p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.07] p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Image
                    src="/icons/adguard.webp"
                    alt="AdGuard"
                    width={22}
                    height={22}
                    className="object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] sm:text-[13px] font-semibold text-white tracking-tight">AdGuard</span>
                    <span className="text-[9px] sm:text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-white/[0.07] text-white/60">
                      Most Popular
                    </span>
                  </div>
                  <div className="text-[10.5px] sm:text-[11px] text-white/50 truncate mt-0.5">
                    Blocks ads, popups and trackers across all websites.
                  </div>
                </div>
              </div>
              <div className="text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all pl-2 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>

            {/* Option 2: Brave Browser */}
            <a
              href="https://brave.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-2.5 md:p-3 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.07] p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Image
                    src="/icons/brave.webp"
                    alt="Brave Browser"
                    width={22}
                    height={22}
                    className="object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] sm:text-[13px] font-semibold text-white tracking-tight">Brave Browser</span>
                    <span className="text-[9px] sm:text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-white/[0.07] text-white/60">
                      Built-in
                    </span>
                  </div>
                  <div className="text-[10.5px] sm:text-[11px] text-white/50 truncate mt-0.5">
                    Comes with ad blocking, tracker protection and a faster, cleaner web.
                  </div>
                </div>
              </div>
              <div className="text-white/30 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all pl-2 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </a>

            {/* Option 3: Android Users (No '>' arrow as requested) */}
            <div className="flex items-center justify-between p-2.5 md:p-3 rounded-xl border border-white/5 bg-white/[0.03]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.07] text-white/80 flex-shrink-0">
                  {/* Android Robot icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.84 3.23 12.95 3 12 3c-.96 0-1.86.23-2.66.63L7.85 2.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.3C6.72 5.14 5.61 6.89 5.53 9h12.94c-.08-2.11-1.19-3.86-2.94-4.84zM9 7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] sm:text-[13px] font-semibold text-white tracking-tight">Android Users</div>
                  <div className="text-[10.5px] sm:text-[11px] text-white/50 truncate mt-0.5">
                    Set Private DNS to{" "}
                    <span className="font-mono text-white/80 bg-white/[0.08] px-1 py-0.5 rounded text-[10px]">
                      dns.adguard.com
                    </span>{" "}
                    or use the AdGuard app.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions: Glow Button & Caption */}
          <div className="mt-3.5 sm:mt-4 pt-1 flex flex-col items-center">
            <div className="relative w-full">
              {/* Subtle bottom glow behind button */}
              <div className="absolute -inset-1 rounded-xl bg-white/20 opacity-30 blur-md pointer-events-none" />

              <button
                type="button"
                onClick={onClose}
                className="relative w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#e3e5ea] to-[#c7c9ce] hover:from-[#ffffff] hover:to-[#d8dadf] text-[#121214] font-semibold text-xs tracking-tight transition-all shadow-lg shadow-black/40 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <span>Continue Watching</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Caption */}
            <p className="mt-2 text-[10px] sm:text-[10.5px] text-white/40 tracking-tight text-center">
              Enjoy an ad-free, uninterrupted streaming experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
