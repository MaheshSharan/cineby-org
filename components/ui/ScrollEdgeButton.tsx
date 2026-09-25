import { useRouter } from "next/router";
import { useScrollEdge } from "@/hooks/useScrollEdge";

function scrollToEdge(direction: "up" | "down") {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const top = direction === "up" ? 0 : document.documentElement.scrollHeight;
  window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
}

export function ScrollEdgeButton() {
  const { visible, direction } = useScrollEdge();
  const { pathname } = useRouter();

  if (pathname.startsWith("/watch")) return null;

  return (
    <button
      type="button"
      aria-label={`Scroll to ${direction === "up" ? "top" : "bottom"}`}
      onClick={() => scrollToEdge(direction)}
      className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-6 z-[9999] flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#05070a]/95 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <svg
        className={`h-5 w-5 transition-transform duration-300 ${direction === "down" ? "rotate-180" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    </button>
  );
}
