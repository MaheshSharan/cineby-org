import React, { useEffect, useRef } from "react";
import type { PlayerServerOption } from "@/lib/player/modeConfig";

interface ServerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  servers: PlayerServerOption[];
  currentServerId: string;
  onSelectServer: (serverId: string) => void;
  onOpenAdBlockGuide?: () => void;
}

export function ServerDrawer({
  isOpen,
  onClose,
  servers,
  currentServerId,
  onSelectServer,
  onOpenAdBlockGuide,
}: ServerDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      closeButtonRef.current?.focus({ preventScroll: true });
    } else if (previousFocusRef.current) {
      // preventScroll: without it the browser scrolls the page to the element that had focus before
      // (the Play button or an episode), pulling the viewer away from the player.
      previousFocusRef.current.focus({ preventScroll: true });
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Drawer Panel - Pure Deep Black / Metallic Gradient */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Server Selection"
        className="relative z-10 w-full max-w-[420px] h-full bg-gradient-to-b from-[#141416] via-[#0d0d0f] to-[#08080a] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl shadow-black/90 animate-in slide-in-from-right duration-250 select-none"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header stays put; only the list below scrolls */}
          <div className="flex shrink-0 items-center justify-between pb-5 border-b border-white/[0.08]">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Select Server</h2>
              <p className="text-xs text-white/50 mt-1">Switch stream or embed provider</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close server drawer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/70 hover:text-white border border-white/10 transition-all cursor-pointer shadow-sm"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Server Options List */}
          <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {servers.map((server) => {
              const isSelected = server.id === currentServerId;
              const isVidy = server.id === "vidy";
              const isVixsrc = server.id === "vixsrc";

              return (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => {
                    onSelectServer(server.id);
                    onClose();
                  }}
                  className={`w-full group flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-gradient-to-r from-white/[0.14] to-white/[0.05] border-white/40 text-white shadow-[0_0_24px_rgba(255,255,255,0.08)] ring-1 ring-white/30"
                      : "bg-[#111114]/80 border-white/[0.08] text-white/80 hover:bg-white/[0.06] hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Glowing indicator pill */}
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${
                        isSelected
                          ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                          : "bg-white/20 group-hover:bg-white/40"
                      }`}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold tracking-tight text-white">{server.name}</span>
                        {isVixsrc && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.08] text-white/90 border border-white/15 tracking-wide">
                            HD • MULTI-LANG
                          </span>
                        )}
                        {isVidy && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/[0.08] text-white/90 border border-white/15 tracking-wide">
                            FAST • CONTROLS
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/50 mt-1 font-normal">
                        {isVixsrc
                          ? "High speed multi-language streams"
                          : isVidy
                          ? "Native episodes & auto-next"
                          : "External Embed Server"}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 border border-white/25 text-white shadow-sm flex-shrink-0">
                      Active
                    </span>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section - AdBlock Guide & Disclaimer */}
        <div className="shrink-0 pt-5 border-t border-white/[0.08] space-y-3.5">
          {onOpenAdBlockGuide && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdBlockGuide();
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-white/[0.02] hover:from-white/[0.10] hover:to-white/[0.04] hover:border-white/20 text-white transition-all duration-200 cursor-pointer group shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] border border-white/15 text-white flex-shrink-0 shadow-inner">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-semibold text-white/95 group-hover:text-white">
                    Having trouble with ads?
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5">View recommended AdBlock guide</div>
                </div>
              </div>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <div className="text-[11px] text-white/40 leading-relaxed px-1">
            Note: Third-party servers operate independently. Use an adblocker or Brave for the cleanest experience.
          </div>
        </div>
      </div>
    </div>
  );
}
