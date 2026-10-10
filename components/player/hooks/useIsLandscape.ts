import { useSyncExternalStore } from "react";

const LANDSCAPE_QUERY = "(orientation: landscape)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(LANDSCAPE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(LANDSCAPE_QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsLandscape(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
