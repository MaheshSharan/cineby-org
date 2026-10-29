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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Server Selection"
        className="relative z-10 w-full max-w-sm h-full bg-[#121214] border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <div className="flex-1 overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Select Server</h2>
              <p className="text-xs text-white/50 mt-0.5">Switch stream or embed provider</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close server drawer"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Server List */}
          <div className="mt-4 space-y-2">
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
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-red-500/80 bg-red-500/10 text-white font-semibold shadow-lg shadow-red-500/5"
                      : "border-white/10 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isSelected
                          ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                          : "bg-emerald-400"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-white">{server.name}</span>
                        {isVidy && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Fast • Controls
                          </span>
                        )}
                        {isVixsrc && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            HD • Multi-lang
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/45 mt-0.5">
                        {isVidy
                          ? "Native episodes & auto-next"
                          : isVixsrc
                          ? "High speed multi-language streams"
                          : "External Embed Server"}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="text-[11px] text-red-400 font-semibold px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 flex-shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-white/30 group-hover:text-white/60">
                      →
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom AdBlock Guide Trigger & Disclaimer */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {onOpenAdBlockGuide && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdBlockGuide();
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-white transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-semibold text-white/90 group-hover:text-white">
                    Having trouble with ads?
                  </div>
                  <div className="text-[11px] text-white/50">View recommended AdBlock guide</div>
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0"
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <div className="text-[11px] text-white/40 leading-relaxed">
            Note: Third-party servers operate independently. Use an adblocker or Brave for the cleanest experience.
          </div>
        </div>
      </div>
    </div>
  );
}
