import { useEffect, useRef, useState } from "react";

import { ArrowUpRightIcon, BellIcon, SparklesIcon, XIcon } from "@/components/ui/icons";

export interface NotificationItem {
  id: string;
  tag: string;
  title: string;
  highlightText?: string;
  description: string;
  actionText: string;
  actionHref: string;
  timestamp: string;
  isUnread?: boolean;
}

/**
 * Announcements shown by the bell. Newest first. While the list is empty the bell opens an empty state.
 * To announce something, add an item with a new unique `id`: the toast opens once per visitor per id.
 */
const NOTIFICATIONS: NotificationItem[] = [];

const SEEN_STORAGE_KEY = "cineby_seen_notification";

function hasSeenNotification(id: string): boolean {
  try {
    return localStorage.getItem(SEEN_STORAGE_KEY) === id;
  } catch {
    return false;
  }
}

function markNotificationSeen(id: string): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, id);
  } catch {
    // Storage is blocked: the toast will simply show again on the next visit.
  }
}

interface NotificationDropdownProps {
  placement?: "top" | "bottom";
  className?: string;
}

export function NotificationDropdown({
  placement = "bottom",
  className = "",
}: NotificationDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mainAlert: NotificationItem | undefined = NOTIFICATIONS[0];

  // Open the toast once per announcement; the unread dot stays until the visitor has seen it.
  useEffect(() => {
    if (!mainAlert || hasSeenNotification(mainAlert.id)) return;

    setHasUnread(true);
    const timer = setTimeout(() => {
      setIsToastVisible(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [mainAlert]);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const markSeen = () => {
    if (mainAlert) markNotificationSeen(mainAlert.id);
    setHasUnread(false);
  };

  const toggleDropdown = () => {
    setIsToastVisible(false);
    setIsDropdownOpen((prev) => !prev);
    markSeen();
  };

  const dismissToast = () => {
    setIsToastVisible(false);
    markSeen();
  };

  return (
    <div ref={containerRef} className={`relative notification-manager ${className}`}>
      {/* Header Bell Trigger Button */}
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={isDropdownOpen}
        aria-haspopup="menu"
        onClick={toggleDropdown}
        className="relative flex items-center justify-center h-8 w-8 rounded-[8px] text-white/75 hover:text-white hover:bg-white/[0.07] transition-colors duration-200 cursor-pointer"
      >
        <BellIcon size={16} />
        {hasUnread && (
          <span
            className="absolute top-1.5 right-1.5 flex h-2 w-2"
            aria-label="New notification"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-2 ring-[#161618]" />
          </span>
        )}
      </button>

      {/* 1. AUTO-OPEN TOAST (Exact Reference Mockup Match) */}
      {isToastVisible && !isDropdownOpen && mainAlert && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed top-[60px] md:top-[68px] right-3 sm:right-6 md:right-8 z-50 w-[92vw] max-w-[440px] animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto"
        >
          <div
            className="relative rounded-[24px] p-5 sm:p-5.5 overflow-hidden text-left"
            style={{
              background:
                "radial-gradient(circle at 86% 40%, rgba(220, 38, 38, 0.28) 0%, rgba(26, 12, 16, 0.96) 55%, rgba(17, 18, 22, 0.98) 80%), #111215",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow:
                "0 24px 60px -12px rgba(0, 0, 0, 0.9), 0 0 40px -8px rgba(220, 38, 38, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(28px)",
            }}
          >
            {/* Ambient Red Glow Backdrop */}
            <div
              className="pointer-events-none absolute -right-10 top-0 w-56 h-56 rounded-full opacity-60 blur-3xl"
              style={{
                background: "radial-gradient(circle, rgba(239, 68, 68, 0.45) 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />

            {/* Glowing Red Light Swoosh running under horn */}
            <svg
              className="pointer-events-none absolute right-0 bottom-3 w-56 h-28 opacity-70 overflow-visible"
              viewBox="0 0 200 100"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="swooshRed" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0" />
                  <stop offset="35%" stopColor="#ef4444" stopOpacity="0.85" />
                  <stop offset="65%" stopColor="#ff4d4f" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
                <filter id="glowBlur" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path
                d="M 10 32 Q 95 85 195 42"
                fill="none"
                stroke="url(#swooshRed)"
                strokeWidth="2.5"
                filter="url(#glowBlur)"
              />
            </svg>

            {/* Top Row: Bell Badge + Official Announcement Tag + Close Button */}
            <div className="relative z-10 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#e50914] text-white shadow-md shadow-red-950/60">
                  <BellIcon size={14} className="stroke-[2.2]" />
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-[#2e1014] text-[#f87171] border border-red-500/25">
                  {mainAlert.tag}
                </span>
              </div>

              <button
                type="button"
                onClick={dismissToast}
                aria-label="Dismiss notification"
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Middle Section: Title, Description & Transparent 3D Horn with Sound Waves */}
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="flex-1 pr-1 max-w-[260px]">
                <h3 className="text-[19px] sm:text-[20px] font-bold text-white tracking-tight leading-[1.25]">
                  {mainAlert.title} <br />
                  {mainAlert.highlightText && (
                    <span className="text-[#e50914] font-bold">
                      {mainAlert.highlightText}
                    </span>
                  )}
                </h3>
                <p className="mt-2 text-[12.5px] text-zinc-400 leading-[1.55] font-normal">
                  {mainAlert.description}
                </p>
              </div>

              {/* 3D Horn Graphic with Glowing Sonic Waves */}
              <div className="relative flex-shrink-0 w-32 h-28 sm:w-36 sm:h-32 -mr-2 -mt-4 flex items-center justify-center pointer-events-none select-none">
                {/* Sonic Wave Arcs */}
                <svg
                  className="absolute left-[-8px] top-[14px] w-12 h-16 pointer-events-none z-10"
                  viewBox="0 0 40 60"
                  aria-hidden="true"
                >
                  <path
                    d="M 32 10 A 30 30 0 0 0 32 50"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                  <path
                    d="M 23 16 A 21 21 0 0 0 23 44"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    opacity="0.95"
                  />
                  <path
                    d="M 13 22 A 12 12 0 0 0 13 38"
                    fill="none"
                    stroke="#ff4d4f"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="1"
                  />
                </svg>

                {/* Transparent 3D Megaphone PNG */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/horn.png"
                  alt="Announcement"
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_18px_rgba(220,38,38,0.45)]"
                />
              </div>
            </div>

            {/* Bottom Row: CTA Button + Maybe Later */}
            <div className="relative z-10 flex items-center justify-between gap-4 mt-4 pt-1">
              <a
                href={mainAlert.actionHref}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full text-[13px] font-semibold text-white bg-[#e50914] hover:bg-[#c90812] active:scale-[0.98] shadow-lg shadow-red-950/60 transition-all duration-200"
              >
                <span>{mainAlert.actionText}</span>
                <ArrowUpRightIcon size={14} className="stroke-[2.5]" />
              </a>

              <button
                type="button"
                onClick={dismissToast}
                className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors px-2 py-2 cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FULL NOTIFICATION DROPDOWN MENU (Opens ONLY when user clicks the Bell icon) */}
      {isDropdownOpen && (
        <div
          className={
            placement === "top"
              ? "fixed bottom-[76px] right-2 sm:right-6 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
              : "absolute top-full right-0 z-50 pt-2 animate-in fade-in zoom-in-95 duration-150"
          }
        >
          <div
            role="menu"
            aria-label="Notifications"
            className="w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] rounded-[20px] overflow-hidden text-left shadow-2xl"
            style={{
              background:
                "radial-gradient(ellipse 90% 70% at 85% 20%, rgba(220, 38, 38, 0.22) 0%, rgba(22, 22, 26, 0.98) 60%), #141518",
              border: "1px solid rgba(255, 255, 255, 0.09)",
              boxShadow:
                "0 24px 60px -12px rgba(0, 0, 0, 0.9), 0 0 35px -8px rgba(220, 38, 38, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(26px)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-white tracking-wide">
                  Notifications
                </span>
                {NOTIFICATIONS.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e50914]/20 text-red-400 border border-red-500/30">
                    {NOTIFICATIONS.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={markSeen}
                className="text-[12px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            </div>

            {/* List */}
            <div className="divide-y divide-white/[0.06] max-h-[420px] overflow-y-auto">
              {NOTIFICATIONS.length === 0 && (
                <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                  <BellIcon size={22} className="text-zinc-500" />
                  <p className="text-[13px] font-medium text-zinc-300">No announcements yet</p>
                  <p className="text-[12px] text-zinc-500">News and updates will appear here.</p>
                </div>
              )}
              {NOTIFICATIONS.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-white/[0.03] transition-colors duration-150 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
                      <SparklesIcon size={13} />
                      <span>{item.tag}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                      {item.timestamp}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-[14px] font-bold text-white leading-snug">
                      {item.title}{" "}
                      {item.highlightText && (
                        <span className="text-[#e50914]">{item.highlightText}</span>
                      )}
                    </h4>
                    <p className="mt-1.5 text-[12.5px] text-zinc-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <a
                    href={item.actionHref}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className="mt-1 inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl text-[12.5px] font-semibold text-white bg-[#e50914] hover:bg-[#c90812] active:scale-[0.98] shadow-md transition-all duration-200"
                  >
                    <span>{item.actionText}</span>
                    <ArrowUpRightIcon size={14} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
