import { useEffect, useRef } from "react";
import Script from "next/script";

import { getGoogleClientId } from "@/lib/env/public";

const GOOGLE_SCRIPT_WAIT_MS = 5000;

interface GoogleOneTapProps {
  onSuccess?: (redirectTo?: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

interface CredentialResponse {
  credential?: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason: () => string; getSkippedReason: () => string }) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export function handleGoogleCredentialResponse(
  credential: string,
  onSuccess?: (redirectTo?: string) => void,
  onError?: (error: string) => void
) {
  if (!credential) {
    onError?.("No credential received from Google");
    return;
  }

  fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  })
    .then(async (res) => {
      if (res.ok) {
        const authData = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
        onSuccess?.(authData?.redirectTo);
      } else {
        const errData = (await res.json().catch(() => null)) as { error?: string } | null;
        onError?.(errData?.error || "Google sign in failed");
      }
    })
    .catch(() => {
      onError?.("Network error during Google sign in");
    });
}

export function GoogleOneTap({
  onSuccess,
  onError,
  disabled = false,
}: GoogleOneTapProps) {
  const clientId = getGoogleClientId();
  // Callbacks change identity on every parent render; keeping them in a ref stops the prompt from re-initializing.
  const callbacksRef = useRef({ onSuccess, onError });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    function handleCallback(response: CredentialResponse) {
      if (!response.credential) return;

      // Dismiss the prompt right away so it cannot linger while the sign in request is in flight.
      window.google?.accounts?.id?.cancel();
      handleGoogleCredentialResponse(
        response.credential,
        (redirectTo) => callbacksRef.current.onSuccess?.(redirectTo),
        (error) => callbacksRef.current.onError?.(error)
      );
    }

    function showPrompt() {
      const googleId = window.google?.accounts?.id;
      if (!googleId) return false;

      googleId.initialize({
        client_id: clientId,
        callback: handleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        prompt_parent_id: "google-one-tap-anchor",
      });
      googleId.prompt();
      return true;
    }

    // The Google script loads asynchronously, so poll briefly until it is ready.
    const interval = showPrompt() ? undefined : setInterval(() => {
      if (showPrompt()) clearInterval(interval);
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), GOOGLE_SCRIPT_WAIT_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      window.google?.accounts?.id?.cancel();
    };
  }, [clientId, disabled]);

  if (disabled) {
    return null;
  }

  return (
    <>
      <div
        id="google-one-tap-anchor"
        className="fixed top-[84px] md:top-[96px] right-4 md:right-8 z-[90] pointer-events-auto"
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />
    </>
  );
}
