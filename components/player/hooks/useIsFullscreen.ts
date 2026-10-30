import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
}

function getSnapshot(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return Boolean(
    document.fullscreenElement ||
      (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
}

function getServerSnapshot(): boolean {
  return false;
}

export function useIsFullscreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
