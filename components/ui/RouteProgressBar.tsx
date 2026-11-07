import { useRouter } from "next/router";
import { useEffect, useState } from "react";

// Navigations that finish before this never show the bar, so instant clicks do not flash it.
const START_DELAY_MS = 100;

export function RouteProgressBar() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let delayTimer: NodeJS.Timeout | null = null;
    let timer: NodeJS.Timeout | null = null;
    let hideTimer: NodeJS.Timeout | null = null;

    const stopTimers = () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (timer) clearInterval(timer);
      if (hideTimer) clearTimeout(hideTimer);
      delayTimer = null;
      timer = null;
      hideTimer = null;
    };

    // Shallow changes (query or hash updates on the same page) load nothing, so they get no bar.
    const handleStart = (_url: string, { shallow }: { shallow: boolean }) => {
      if (shallow) return;

      // A second start (for example a redirect right after load) must not leave the first interval running:
      // it would restart the bar after completion and leave it stuck near 85%.
      stopTimers();

      delayTimer = setTimeout(() => {
        setProgress(15);
        setNavigating(true);

        timer = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) return prev;
            return prev + Math.floor(Math.random() * 12) + 4;
          });
        }, 150);
      }, START_DELAY_MS);
    };

    const handleComplete = (_url: string, { shallow }: { shallow: boolean }) => {
      if (shallow) return;

      const wasShown = timer !== null;
      stopTimers();
      if (!wasShown) return;

      setProgress(100);
      hideTimer = setTimeout(() => {
        setNavigating(false);
        setProgress(0);
      }, 250);
    };

    const handleError = (_error: unknown, url: string, options: { shallow: boolean }) => handleComplete(url, options);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleError);

    return () => {
      stopTimers();
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleError);
    };
  }, [router]);

  if (!navigating && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] h-[2px] w-full bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-primary/80 via-primary to-rose-400 shadow-[0_0_10px_rgba(229,9,20,0.8)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "150ms" : "300ms",
        }}
      />
    </div>
  );
}
