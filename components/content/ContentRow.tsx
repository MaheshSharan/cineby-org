import { useCallback, useRef, useState, useEffect, type ReactNode } from "react";

interface ContentRowProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ContentRow({ title, action, children, className = "" }: ContentRowProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollState = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    checkScrollState();
    scroller.addEventListener("scroll", checkScrollState);
    window.addEventListener("resize", checkScrollState);

    return () => {
      scroller.removeEventListener("scroll", checkScrollState);
      window.removeEventListener("resize", checkScrollState);
    };
  }, [checkScrollState, children]);

  const scrollByPage = useCallback((direction: "left" | "right") => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const pageSize = scroller.clientWidth * 0.75;
    scroller.scrollBy({ left: direction === "left" ? -pageSize : pageSize, behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const activeElement = document.activeElement;
      const scroller = scrollerRef.current;
      if (!scroller) return;

      // Find all focusable interactive cards in this row
      const focusable = Array.from(
        scroller.querySelectorAll<HTMLElement>('a, button, [tabindex="0"]')
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

      const currentIndex = focusable.indexOf(activeElement as HTMLElement);
      if (currentIndex !== -1) {
        e.preventDefault();
        const nextIndex =
          e.key === "ArrowLeft"
            ? Math.max(0, currentIndex - 1)
            : Math.min(focusable.length - 1, currentIndex + 1);

        const target = focusable[nextIndex];
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }
    }
  }, []);

  const headingId = title && typeof title === "string" ? `row-heading-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined;

  return (
    <section
      aria-labelledby={headingId}
      className={`group/row relative ${className}`}
    >
      {title || action ? (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title ? (
            <h2 id={headingId} className="heading-trail text-xl font-semibold text-text-hi md:text-2xl">
              {title}
            </h2>
          ) : (
            <div />
          )}
          {action ? <div className="flex-shrink-0">{action}</div> : null}
        </div>
      ) : null}

      <div className="relative w-full">
        {canScrollLeft ? (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByPage("left")}
            className="absolute left-0 top-0 bottom-2 z-20 flex w-12 items-center justify-start bg-gradient-to-r from-[#05070a] via-[#05070a]/70 to-transparent text-white/70 opacity-0 transition-opacity duration-normal hover:text-white group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        ) : null}

        <div
          ref={scrollerRef}
          tabIndex={0}
          role="region"
          aria-label={typeof title === "string" ? title : "Content row"}
          onKeyDown={handleKeyDown}
          className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth pb-2 touch-pan-x focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 rounded-[10px]"
        >
          {children}
        </div>

        {canScrollRight ? (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByPage("right")}
            className="absolute right-0 top-0 bottom-2 z-20 flex w-12 items-center justify-end bg-gradient-to-l from-[#05070a] via-[#05070a]/70 to-transparent pr-2 text-white/70 opacity-0 transition-opacity duration-normal hover:text-white group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : null}
      </div>
    </section>
  );
}