import { useEffect } from "react";
import Script from "next/script";

interface GoogleOneTapProps {
  clientId?: string;
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
  clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  onSuccess,
  onError,
  disabled = false,
}: GoogleOneTapProps) {
  useEffect(() => {
    if (disabled || !clientId) {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
      return;
    }

    const handleCallback = (response: CredentialResponse) => {
      if (response.credential) {
        handleGoogleCredentialResponse(response.credential, onSuccess, onError);
      }
    };

    const initializeOneTap = () => {
      if (!window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
        prompt_parent_id: "google-one-tap-anchor",
      });

      window.google.accounts.id.prompt();
    };

    if (window.google?.accounts?.id) {
      initializeOneTap();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initializeOneTap();
        }
      }, 200);

      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [clientId, disabled, onError, onSuccess]);

  if (disabled || !clientId) {
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
