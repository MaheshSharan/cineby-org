import { IMA_SDK_URL, SDK_LOAD_TIMEOUT_MS } from "./constants";
import type { ImaSdk } from "./types";

export type AdSdkFailure = "sdk_blocked" | "sdk_timeout";

export class AdSdkError extends Error {
  readonly reason: AdSdkFailure;

  constructor(reason: AdSdkFailure) {
    super(`IMA SDK failed to load: ${reason}`);
    this.name = "AdSdkError";
    this.reason = reason;
  }
}

interface ImaWindow {
  google?: { ima?: ImaSdk };
}

let pendingLoad: Promise<ImaSdk> | null = null;

function readLoadedSdk(): ImaSdk | undefined {
  return (window as unknown as ImaWindow).google?.ima;
}

function injectSdkScript(timeoutMs: number): Promise<ImaSdk> {
  return new Promise<ImaSdk>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => reject(new AdSdkError("sdk_timeout")), timeoutMs);

    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      const sdk = readLoadedSdk();

      if (sdk) {
        resolve(sdk);
      } else {
        reject(new AdSdkError("sdk_blocked"));
      }
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new AdSdkError("sdk_blocked"));
    };
    document.head.appendChild(script);
  });
}

/**
 * Loads Google's IMA SDK on demand, only on pages that play ads. Concurrent callers share one
 * load. A failed load is not cached, so a later title can try again.
 */
export function loadImaSdk(timeoutMs: number = SDK_LOAD_TIMEOUT_MS): Promise<ImaSdk> {
  const loaded = readLoadedSdk();

  if (loaded) {
    return Promise.resolve(loaded);
  }

  if (!pendingLoad) {
    pendingLoad = injectSdkScript(timeoutMs).catch((error: unknown) => {
      pendingLoad = null;
      document.querySelector(`script[src="${IMA_SDK_URL}"]`)?.remove();
      throw error;
    });
  }

  return pendingLoad;
}
