import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  return () => {
    document.removeEventListener("fullscreenchange", onChange);
    document.removeEventListener("webkitfullscreenchange", onChange);
  };
}

function getSnapshot(): boolean {
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
