import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import type { User } from "@/lib/db/types";
import { AuthModal, type AuthMode } from "@/components/auth/AuthModal";
import { AuthTransitionOverlay } from "@/components/auth/AuthTransitionOverlay";
import { Toast } from "@/components/ui/Toast";

import { syncGuestHistoryToServer } from "@/lib/api/history";
import { GoogleOneTap } from "@/components/auth/GoogleOneTap";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  authModalOpen: boolean;
  authModalMode: AuthMode;
  openAuthModal: (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthMode) => void;
  redirectToLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>("login");
  const [isCompletingAuth, setIsCompletingAuth] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const refresh = useCallback(async () => {
    // Fast Client-Side Check: If visitor has no logged-in flag cookie, they are guest.
    // Skips firing an unnecessary /api/auth/me edge Worker invocation on every page load.
    if (typeof document !== "undefined" && !document.cookie.includes("cineby_logged_in=1")) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/me");

      if (response.ok) {
        const data = (await response.json()) as { user: User | null };
        setUser(data.user);
        if (data.user) {
          // Merge any offline/guest watch progress into the active profile
          syncGuestHistoryToServer().catch(() => {});
        }
      } else {
        setUser(null);
        if (response.status === 401 && typeof document !== "undefined") {
          document.cookie = "cineby_logged_in=; Path=/; Max-Age=0";
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      showToast("Logged out successfully");
    } finally {
      setUser(null);
    }
  }, [showToast]);

  // The session must be loaded before routing, otherwise the destination page mounts with no user and flashes.
  const completeAuthentication = useCallback(
    async (redirectTo: string) => {
      setIsCompletingAuth(true);
      try {
        await refresh();
        await router.push(redirectTo);
      } finally {
        setIsCompletingAuth(false);
      }
    },
    [refresh, router]
  );

  const handleGoogleOneTapSuccess = useCallback(
    (redirectTo?: string) => {
      showToast("Signed in with Google");
      void completeAuthentication(redirectTo ?? "/profiles");
    },
    [completeAuthentication, showToast]
  );

  const openAuthModal = useCallback((mode: AuthMode = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const redirectToLogin = useCallback(() => {
    openAuthModal("login");
  }, [openAuthModal]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (router.pathname === "/login") {
      setAuthModalMode("login");
      setAuthModalOpen(true);
    } else if (router.pathname === "/register") {
      setAuthModalMode("register");
      setAuthModalOpen(true);
    } else if (router.pathname !== "/login" && router.pathname !== "/register") {
      setAuthModalOpen(false);
    }
  }, [router.pathname, isLoading]);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    // Route Guard (Netflix style): Authenticated users with 0 profiles must create a profile first
    if (user.hasProfiles === false && !router.pathname.startsWith("/profiles")) {
      void router.replace("/profiles?create=true");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-evaluate only when user, loading state, or pathname changes, not on shallow query changes
  }, [isLoading, user, router.pathname]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      toastMessage,
      showToast,
      clearToast,
      refresh,
      logout,
      authModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      setAuthModalMode,
      redirectToLogin,
    }),
    [
      user,
      isLoading,
      toastMessage,
      showToast,
      clearToast,
      refresh,
      logout,
      authModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      setAuthModalMode,
      redirectToLogin,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <Toast message={toastMessage} onClose={clearToast} />
      <GoogleOneTap
        disabled={Boolean(user) || isLoading || isCompletingAuth}
        onSuccess={handleGoogleOneTapSuccess}
        onError={showToast}
      />
      <AuthTransitionOverlay isVisible={isCompletingAuth} />
      <AuthModal
        open={authModalOpen}
        mode={authModalMode}
        onClose={closeAuthModal}
        onModeChange={setAuthModalMode}
        onAuthenticated={completeAuthentication}
        showToast={showToast}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}