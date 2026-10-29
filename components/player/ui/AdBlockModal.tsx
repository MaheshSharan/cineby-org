import React, { useEffect, useRef } from "react";
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adblock-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#121214]/95 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 text-left select-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h2 id="adblock-modal-title" className="text-base font-bold text-white tracking-tight">
                AdBlock Recommendation
              </h2>
              <p className="text-xs text-white/50 mt-0.5">Stream uninterrupted without popups</p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close AdBlock modal"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Message */}
        <p className="mt-4 text-xs md:text-sm text-white/80 leading-relaxed">
          Please use any adblocker to block popups and ads while stream plays:
        </p>

        {/* Options list */}
        <div className="mt-4 space-y-2.5">
          {/* Chrome / Desktop Option */}
          <a
            href={ADGUARD_CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                  <line x1="21.17" y1="8" x2="12" y2="8" />
                  <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                  <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors">
                  AdGuard AdBlocker
                </div>
                <div className="text-[11px] text-white/50 truncate">Chrome & desktop browser extension</div>
              </div>
            </div>
            <div className="text-white/40 group-hover:text-white transition-colors pl-2 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </a>

          {/* Android Option */}
          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white">Android Users</div>
                <div className="text-[11px] text-white/50">
                  Set Private DNS to{" "}
                  <code className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-400 font-mono text-[10.5px]">
                    dns.adguard.com
                  </code>{" "}
                  or use the AdGuard app
                </div>
              </div>
            </div>
          </div>

          {/* Brave Browser Option */}
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-amber-200">The Best of All: Use Brave Browser!</div>
                <div className="text-[11px] text-amber-200/60">Built-in Shield automatically blocks all trackers & ads</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs tracking-wide transition-all shadow-lg shadow-red-600/30 cursor-pointer"
          >
            Got it, continue watching
          </button>
        </div>
      </div>
    </div>
  );
}
