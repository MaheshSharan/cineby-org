import { useEffect, useRef, useState, type RefObject } from "react";

/** Tracks the rendered width of an element. Zero until it has been measured. */
export function useElementWidth<T extends HTMLElement>(): { ref: RefObject<T | null>; width: number } {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    setWidth(element.clientWidth);

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
