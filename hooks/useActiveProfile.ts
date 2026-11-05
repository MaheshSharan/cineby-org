import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getJson } from "@/lib/api/client";
import type { PublicProfile } from "@/lib/profile/publicProfile";
import { loadSession, readSessionSnapshot, updateSessionProfiles } from "@/lib/session/sessionStore";

export interface ActiveProfile {
  id: number;
  name: string;
  avatarUrl: string;
}

interface ProfilesResponse {
  profiles: PublicProfile[];
  activeProfileId?: number;
}

async function fetchProfiles(userId: number, forceRefresh: boolean): Promise<ProfilesResponse | null> {
  if (!forceRefresh) {
    // Header, Dock and the profile menu all mount this hook: they share the session snapshot
    // instead of each asking the server.
    const session = readSessionSnapshot() ?? (await loadSession({ force: false }));
    return session?.user.id === userId
      ? { profiles: session.profiles, activeProfileId: session.activeProfileId ?? undefined }
      : null;
  }

  // Explicit changes (switching or editing a profile) always ask the server. Overlapping calls share one request.
  try {
    const data = await getJson<ProfilesResponse>("/api/profiles");
    updateSessionProfiles(data.profiles, data.activeProfileId ?? null);
    return data;
  } catch {
    return null;
  }
}

/**
 * Hook providing the active profile across the entire app.
 * Scoped per user ID so different accounts never share profile data.
 * Listens for storage events so changes in profiles.tsx are
 * reflected instantly in Header, Dock, ProfileDropdown, etc.
 */
export function useActiveProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(() => {
    if (typeof window === "undefined" || userId === null) return null;
    try {
      const cached = localStorage.getItem(`cineby_active_profile_${userId}`);
      return cached ? (JSON.parse(cached) as ActiveProfile) : null;
    } catch {
      return null;
    }
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);

  const refreshProfile = useCallback((forceRefresh = true) => {
    if (userId === null) {
      setActiveProfile(null);
      setIsLoadingProfile(false);
      return;
    }

    // Try reading cached profile synchronously if not set
    try {
      const cached = localStorage.getItem(`cineby_active_profile_${userId}`);
      if (cached) {
        const parsed = JSON.parse(cached) as ActiveProfile;
        setActiveProfile((prev) => prev ?? parsed);
      }
    } catch {
      // Ignore localStorage parse error
    }

    void fetchProfiles(userId, forceRefresh)
      .then((data) => {
        const active =
          data?.profiles.find((profile) => profile.id === data.activeProfileId) ??
          data?.profiles[0] ??
          null;
        setActiveProfile(active);
        if (active && typeof window !== "undefined") {
          try {
            localStorage.setItem(`cineby_active_profile_${userId}`, JSON.stringify(active));
          } catch {
            // Ignore storage write error
          }
        }
      })
      .catch(() => setActiveProfile(null))
      .finally(() => {
        setIsLoadingProfile(false);
      });
  }, [userId]);

  // Re-read when user changes (login/logout/switch account)
  useEffect(() => {
    refreshProfile(false);
  }, [refreshProfile]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || (userId !== null && e.key === `cineby_active_profile_${userId}`)) {
        refreshProfile();
      }
    };

    const handleProfileChange = () => {
      refreshProfile();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cineby:profile-change", handleProfileChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cineby:profile-change", handleProfileChange);
    };
  }, [refreshProfile, userId]);

  return { activeProfile, isLoadingProfile, refreshProfile };
}

