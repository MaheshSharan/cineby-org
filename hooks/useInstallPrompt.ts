import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface UseInstallPromptResult {
  /** Chrome and Edge can show their native install dialog. */
  canPromptInstall: boolean;
  /** iOS has no install API, so the user must be told to use Add to Home Screen. */
  isIos: boolean;
  isStandalone: boolean;
  promptInstall: () => Promise<void>;
}

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

function detectIos(): boolean {
  const isIphoneOrIpod = /iphone|ipod/i.test(navigator.userAgent);
  // iPadOS reports a desktop Mac user agent, so touch support tells the two apart.
  const isIpad = /ipad/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return isIphoneOrIpod || isIpad;
}

export function useInstallPrompt(): UseInstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIos(detectIos());
    setIsStandalone(detectStandalone());

    function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      // Stops Chrome's own mini-infobar so the app can choose when to ask.
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // A prompt event can only be used once; Chrome fires a new one if the user declined.
    setDeferredPrompt(null);
  }

  return { canPromptInstall: deferredPrompt !== null, isIos, isStandalone, promptInstall };
}
