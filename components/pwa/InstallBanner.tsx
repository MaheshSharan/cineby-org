import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { XIcon } from "@/components/ui/icons";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import {
  INSTALL_BANNER_DELAY_MS,
  INSTALL_BANNER_HIDDEN_ROUTE_PREFIXES,
} from "@/lib/constants/pwa";
import {
  isDismissalActive,
  readInstallDismissal,
  rememberInstallDismissal,
} from "@/lib/pwa/installDismissal";

export function InstallBanner() {
  const router = useRouter();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const { canPromptInstall, isIos, isStandalone, promptInstall } = useInstallPrompt();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsTouchDevice(window.matchMedia("(hover: none) and (pointer: coarse)").matches);
    }
  }, []);
  const [isDelayElapsed, setIsDelayElapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Asking right at page load feels like spam; wait until the visitor has been browsing for a while.
    const timer = setTimeout(() => {
      setIsDismissed(isDismissalActive(readInstallDismissal(), Date.now()));
      setIsDelayElapsed(true);
    }, INSTALL_BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const isHiddenRoute = INSTALL_BANNER_HIDDEN_ROUTE_PREFIXES.some((prefix) =>
    router.pathname.startsWith(prefix)
  );
  const canInstall = canPromptInstall || isIos;
  const isVisible =
    isDelayElapsed && !isDismissed && !isStandalone && !isHiddenRoute && isTouchDevice && canInstall;

  if (!isVisible) {
    return null;
  }

  function handleDismiss() {
    rememberInstallDismissal(Date.now());
    setIsDismissed(true);
  }

  return (
    <section
      aria-label="Install Cineby"
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-50 mx-auto flex max-w-[380px] items-center gap-3 rounded-2xl border border-white/[0.12] bg-[#07090e]/90 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Install Cineby</p>
        <p className="text-xs leading-snug text-white/60">
          {canPromptInstall
            ? "Add it to your home screen for a full-screen, app-like experience."
            : "Tap Share, then Add to Home Screen."}
        </p>
      </div>
      {canPromptInstall && (
        <button
          type="button"
          onClick={promptInstall}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground active:scale-95"
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss install suggestion"
        className="shrink-0 rounded-full p-1.5 text-white/50 active:scale-90"
      >
        <XIcon size={16} />
      </button>
    </section>
  );
}
