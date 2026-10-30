import { useSyncExternalStore } from "react";

// Primary input is a finger: phones and tablets, in any orientation or window size.
export const TOUCH_DEVICE_QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const query = window.matchMedia(TOUCH_DEVICE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(TOUCH_DEVICE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
