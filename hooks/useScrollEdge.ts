import { useEffect, useRef, useState } from "react";

const VISIBLE_AT_PERCENT = 0.2;
const DEADZONE_PX = 12;

interface ScrollEdgeState {
  visible: boolean;
  direction: "up" | "down";
}

/** Tracks scroll position with 0 layout thrash: one rAF-gated listener, state only changes on real transitions. */
export function useScrollEdge(): ScrollEdgeState {
  const [state, setState] = useState<ScrollEdgeState>({ visible: false, direction: "up" });
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const visible = maxScroll > 0 && y / maxScroll >= VISIBLE_AT_PERCENT;

        const delta = y - lastY.current;
        if (Math.abs(delta) > DEADZONE_PX) {
          lastY.current = y;
          setState({ visible, direction: delta > 0 ? "up" : "down" });
        } else {
          setState((prev) => (prev.visible === visible ? prev : { ...prev, visible }));
        }
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return state;
}
