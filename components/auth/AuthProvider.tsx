import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import type { User } from "@/lib/db/types";
import { AuthModal, type AuthMode } from "@/components/auth/AuthModal";
import { Toast } from "@/components/ui/Toast";

import { syncGuestHistoryToServer } from "@/lib/api/history";

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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const refresh = useCallback(async () => {
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
  }, [isLoading, user, router]);

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
      <AuthModal
        open={authModalOpen}
        mode={authModalMode}
        onClose={closeAuthModal}
        onModeChange={setAuthModalMode}
        onAuthenticated={refresh}
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