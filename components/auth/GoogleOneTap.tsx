import { useEffect, useRef } from "react";
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
          cancel: () => void;
        };
      };
    };
  }
}

export function GoogleOneTap({
  clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  onSuccess,
  onError,
  disabled = false,
}: GoogleOneTapProps) {
  const isPromptingRef = useRef(false);

  useEffect(() => {
    if (disabled || !clientId) {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        window.google.accounts.id.cancel();
      }
      return;
    }

    const handleCredentialResponse = async (response: CredentialResponse) => {
      if (!response.credential) {
        onError?.("No credential received from Google");
        return;
      }

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
        });

        if (res.ok) {
          const authData = (await res.json().catch(() => null)) as { redirectTo?: string } | null;
          onSuccess?.(authData?.redirectTo);
        } else {
          const errData = (await res.json().catch(() => null)) as { error?: string } | null;
          onError?.(errData?.error || "Google sign in failed");
        }
      } catch {
        onError?.("Network error during Google sign in");
      }
    };

    const initializeOneTap = () => {
      if (!window.google?.accounts?.id || isPromptingRef.current) return;
      isPromptingRef.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        itp_support: true,
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
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
    />
  );
}
