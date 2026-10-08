import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export function RouteProgressBar() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const handleStart = () => {
      setProgress(15);
      setNavigating(true);

      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) return prev;
          return prev + Math.floor(Math.random() * 12) + 4;
        });
      }, 150);
    };

    const handleComplete = () => {
      if (timer) clearInterval(timer);
      setProgress(100);
      setTimeout(() => {
        setNavigating(false);
        setProgress(0);
      }, 250);
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      if (timer) clearInterval(timer);
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
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
