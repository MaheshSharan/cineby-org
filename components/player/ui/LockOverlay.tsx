import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { UNLOCK_BUTTON_VISIBLE_MS } from "../constants";

interface LockOverlayProps {
  onUnlock: () => void;
}

export function LockOverlay({ onUnlock }: LockOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [isUnlockVisible, setIsUnlockVisible] = useState(false);

  useEffect(() => {
    // The control bar is inert while locked, so take focus to keep keyboard users able to reveal Unlock.
    overlayRef.current?.focus();

    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  function handleReveal() {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    setIsUnlockVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      setIsUnlockVisible(false);
      hideTimerRef.current = null;
    }, UNLOCK_BUTTON_VISIBLE_MS);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleReveal();
    }
  }

  return (
    <>
      <div
        ref={overlayRef}
        role="button"
        tabIndex={0}
        aria-label="Screen locked. Press Enter to show the unlock button."
        onClick={handleReveal}
        onKeyDown={handleKeyDown}
        className="pointer-events-auto absolute inset-0 z-[100] cursor-default touch-none outline-none"
      />

      <button
        type="button"
        onClick={onUnlock}
        className={`absolute left-1/2 top-1/2 z-[110] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl transition-[opacity,visibility] duration-300 hover:bg-white/90 ${
          isUnlockVisible ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeLinecap="round" />
        </svg>
        Unlock Controls
      </button>
    </>
  );
}
