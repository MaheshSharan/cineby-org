import { useSyncExternalStore } from "react";

import { TOUCH_DEVICE_QUERY } from "../constants";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(TOUCH_DEVICE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(TOUCH_DEVICE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
