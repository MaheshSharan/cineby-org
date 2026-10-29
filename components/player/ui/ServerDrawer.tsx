import React, { useEffect, useRef } from "react";
import type { PlayerServerOption } from "@/lib/player/modeConfig";

interface ServerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  servers: PlayerServerOption[];
  currentServerId: string;
  onSelectServer: (serverId: string) => void;
}

export function ServerDrawer({
  isOpen,
  onClose,
  servers,
  currentServerId,
  onSelectServer,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Server Selection"
        className="relative z-10 w-full max-w-sm h-full bg-neutral-900 border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white">Select Server</h2>
              <p className="text-xs text-white/50 mt-0.5">Choose your stream or embed source</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close server drawer"
              className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {servers.map((server) => {
              const isSelected = server.id === currentServerId;
              return (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => {
                    onSelectServer(server.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-red-500/80 bg-red-500/10 text-white font-semibold"
                      : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isSelected ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-emerald-500"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium">{server.name}</div>
                      <div className="text-[11px] text-white/40">
                        External Embed Server
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs text-red-400 font-medium px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
          <span>Note: Embedded third-party servers run independently and may feature their own playback controls or ads.</span>
        </div>
      </div>
    </div>
  );
}
