import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { AvatarModal } from "@/components/profile/AvatarModal";
import { PinUnlockModal } from "@/components/profile/PinUnlockModal";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { ProfileGrid } from "@/components/profile/ProfileGrid";
import { ProfileGridSkeleton } from "@/components/profile/ProfileGridSkeleton";
import { ProfileWizard } from "@/components/profile/ProfileWizard";
import type { Profile, ProfileListResponse } from "@/components/profile/types";
import { PageSeo } from "@/components/seo/PageSeo";
import { LogOutIcon } from "@/components/ui/icons";
import { CLASSIC_AVATARS } from "@/lib/profile/avatars";
import { syncGuestHistoryToServer } from "@/lib/api/history";

export default function ProfilesPage() {
  const router = useRouter();
  const { user, isLoading, showToast, refresh, logout } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isProfilesLoading, setIsProfilesLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // PIN Unlock Modal state (when switching to PIN-locked profile)
  const [pinPromptProfile, setPinPromptProfile] = useState<Profile | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState(CLASSIC_AVATARS[0].url);
  const [editPinEnabled, setEditPinEnabled] = useState(false);
  const [editPin, setEditPin] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 5-Step Wizard State
  const [isCreating, setIsCreating] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("create=true")
  );
  const [step, setStep] = useState(1);
  const [showAllWizardAvatars, setShowAllWizardAvatars] = useState(false);
  const [wizardName, setWizardName] = useState("");
  const [wizardAvatar, setWizardAvatar] = useState<string>(CLASSIC_AVATARS[0].url);
  const [wizardPin, setWizardPin] = useState("");
  const [selectedMovieGenres, setSelectedMovieGenres] = useState<string[]>([]);
  const [selectedTvGenres, setSelectedTvGenres] = useState<string[]>([]);
  const [isFinishingWizard, setIsFinishingWizard] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = (await res.json()) as ProfileListResponse;
        const list = data.profiles ?? [];
        setProfiles(list);

        // A user with zero profiles is still mid-onboarding: keep the wizard up.
        if (list.length === 0) {
          setIsCreating(true);
        }

        // Sync active profile to localStorage for client-side hooks
        if (user && list.length > 0) {
          const activeId = data.activeProfileId;
          const active = list.find((p) => p.id === activeId) || list[0];
          const activeKey = `cineby_active_profile_${user.id}`;
          localStorage.setItem(activeKey, JSON.stringify(active));
          window.dispatchEvent(new CustomEvent("cineby:profile-change", { detail: { profileId: active.id } }));
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setIsProfilesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
      return;
    }
    if (user) {
      loadProfiles();
    }
  }, [isLoading, router, user, loadProfiles]);

  // Sync wizard visibility with router query
  useEffect(() => {
    if (router.query.create === "true") {
      setIsCreating(true);
      setStep(1);
    }
  }, [router.query.create]);

  // Handle Profile Selection
  const handleSelectProfile = async (profile: Profile) => {
    if (isManaging) {
      handleOpenEditProfile(profile);
      return;
    }

    if (profile.hasPin) {
      setPinPromptProfile(profile);
      setEnteredPin("");
      setPinError(null);
      return;
    }

    await performSelectProfile(profile, "");
  };

  const performSelectProfile = async (profile: Profile, pinCode: string) => {
    setIsSubmittingPin(true);
    setPinError(null);

    try {
      const res = await fetch(`/api/profiles/${profile.id}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCode }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setPinError(data.error || "Incorrect PIN. Please try again.");
        return;
      }

      if (user) {
        const activeKey = `cineby_active_profile_${user.id}`;
        localStorage.setItem(activeKey, JSON.stringify(profile));
      }
      window.dispatchEvent(new CustomEvent("cineby:profile-change", { detail: { profileId: profile.id } }));

      // Merge any offline guest history into the selected profile
      syncGuestHistoryToServer().catch(() => {});

      setPinPromptProfile(null);
      showToast(`Switched to ${profile.name}`);
      router.push("/");
    } catch {
      setPinError("Failed to select profile.");
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleOpenEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setEditName(profile.name);
    setEditAvatar(profile.avatarUrl);
    setEditPinEnabled(profile.hasPin);
    setEditPin("");
  };

  const handleSaveEditProfile = async () => {
    if (!editingProfile || !editName.trim()) return;

    setIsSavingEdit(true);
    try {
      const payload: { name: string; avatarUrl: string; pin?: string } = {
        name: editName.trim(),
        avatarUrl: editAvatar,
      };

      if (editPinEnabled) {
        if (editPin.trim()) {
          payload.pin = editPin.trim();
        }
      } else if (editingProfile.hasPin) {
        payload.pin = ""; // Clear existing PIN
      }

      const res = await fetch(`/api/profiles/${editingProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        showToast(data.error || "Unable to update profile.");
        return;
      }

      showToast("Profile updated");
      setEditingProfile(null);
      await loadProfiles();
    } catch {
      showToast("Unable to update profile.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!editingProfile) return;

    if (profiles.length <= 1) {
      showToast("Cannot delete your only profile");
      return;
    }

    try {
      const res = await fetch(`/api/profiles/${editingProfile.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        showToast("Cannot delete this profile.");
        return;
      }

      showToast("Profile deleted");
      setEditingProfile(null);
      await loadProfiles();
    } catch {
      showToast("Unable to delete profile.");
    }
  };

  const handleStartWizard = () => {
    if (profiles.length >= 5) {
      showToast("Maximum 5 profiles reached.");
      return;
    }
    setIsCreating(true);
    setStep(1);
    setWizardName("");
    setWizardAvatar(CLASSIC_AVATARS[0].url);
    setWizardPin("");
    setSelectedMovieGenres([]);
    setSelectedTvGenres([]);
  };

  const handleCancelWizard = () => {
    // Onboarding must complete: a user cannot be left with zero profiles.
    if (profiles.length === 0) {
      showToast("Create at least one profile to continue.");
      return;
    }
    setIsCreating(false);
    router.replace("/profiles", undefined, { shallow: true });
  };

  const handleFinishWizard = async () => {
    setIsFinishingWizard(true);
    try {
      const pinValue = wizardPin.trim();
      const payload: {
        name: string;
        avatarUrl: string;
        pin?: string;
        movieGenres?: string[];
        tvGenres?: string[];
        autoSelect: boolean;
      } = {
        name: wizardName.trim() || "User",
        avatarUrl: wizardAvatar,
        movieGenres: selectedMovieGenres,
        tvGenres: selectedTvGenres,
        autoSelect: true,
      };

      if (pinValue) {
        payload.pin = pinValue;
      }

      const createRes = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const err = (await createRes.json()) as { error?: string };
        showToast(err.error || "Unable to create profile.");
        return;
      }

      const createData = (await createRes.json()) as { profile: Profile };
      const newProfile = createData.profile;

      if (user) {
        const activeKey = `cineby_active_profile_${user.id}`;
        localStorage.setItem(activeKey, JSON.stringify(newProfile));
      }
      window.dispatchEvent(new CustomEvent("cineby:profile-change", { detail: { profileId: newProfile.id } }));

      // Merge any offline guest history into the newly created profile
      syncGuestHistoryToServer().catch(() => {});

      // Refresh auth state so user.hasProfiles becomes true immediately
      await refresh();

      // Land on "Who's watching?" so the user sees and selects the profile
      // they just created, instead of jumping straight to the home screen.
      await loadProfiles();
      setIsCreating(false);
      router.replace("/profiles", undefined, { shallow: true });
      showToast(`Welcome, ${newProfile.name}!`);
    } catch {
      showToast("Unable to complete profile creation.");
    } finally {
      setIsFinishingWizard(false);
    }
  };

  const toggleGenre = (genreId: string, isMovie: boolean) => {
    if (isMovie) {
      setSelectedMovieGenres((curr) =>
        curr.includes(genreId) ? curr.filter((id) => id !== genreId) : curr.length < 3 ? [...curr, genreId] : curr
      );
    } else {
      setSelectedTvGenres((curr) =>
        curr.includes(genreId) ? curr.filter((id) => id !== genreId) : curr.length < 3 ? [...curr, genreId] : curr
      );
    }
  };

  return (
    <>
      <PageSeo
        title={`${
          editingProfile ? "Edit profile" : isCreating ? "Create your profile" : "Who's watching?"
        } - Cineby`}
        noindex
      />

      <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#05070a] text-white">
        {/* Ambient Red Radial Gradient */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-[390px] left-1/2 h-[900px] w-[1200px] -translate-x-1/2"
            style={{
              background:
                "radial-gradient(closest-side, rgba(220, 38, 38, 0.08) 0%, rgba(220, 38, 38, 0.04) 35%, rgba(220, 38, 38, 0.02) 60%, rgba(220, 38, 38, 0.01) 80%, rgba(220, 38, 38, 0) 100%)",
            }}
          />
        </div>

        {/* Top-Right Sign Out Button */}
        {user && (
          <div className="absolute top-5 right-5 sm:top-6 sm:right-8 z-30">
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/");
              }}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Sign out"
            >
              <LogOutIcon size={14} className="transition-transform group-hover:-translate-x-0.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        <div className="relative flex min-h-[100dvh] items-center justify-center px-6 py-14">
          {editingProfile ? (
            <ProfileEditor
              profile={editingProfile}
              name={editName}
              avatarUrl={editAvatar}
              pinEnabled={editPinEnabled}
              pin={editPin}
              isSaving={isSavingEdit}
              onNameChange={setEditName}
              onPinEnabledChange={setEditPinEnabled}
              onPinChange={setEditPin}
              onOpenAvatarModal={() => setIsAvatarModalOpen(true)}
              onCancel={() => setEditingProfile(null)}
              onSave={handleSaveEditProfile}
              onDelete={handleDeleteProfile}
            />
          ) : isProfilesLoading ? (
            <ProfileGridSkeleton />
          ) : !isCreating ? (
            <ProfileGrid
              profiles={profiles}
              isManaging={isManaging}
              onToggleManage={() => setIsManaging((prev) => !prev)}
              onSelectProfile={handleSelectProfile}
              onAddProfile={handleStartWizard}
            />
          ) : (
            <ProfileWizard
              step={step}
              name={wizardName}
              avatar={wizardAvatar}
              pin={wizardPin}
              selectedMovieGenres={selectedMovieGenres}
              selectedTvGenres={selectedTvGenres}
              showAllAvatars={showAllWizardAvatars}
              isFinishing={isFinishingWizard}
              onStepChange={setStep}
              onNameChange={setWizardName}
              onAvatarChange={setWizardAvatar}
              onPinChange={setWizardPin}
              onToggleMovieGenre={(id) => toggleGenre(id, true)}
              onToggleTvGenre={(id) => toggleGenre(id, false)}
              onShowAllAvatars={() => setShowAllWizardAvatars(true)}
              onCancel={handleCancelWizard}
              onFinish={handleFinishWizard}
            />
          )}
        </div>

        {/* PIN Unlock Modal Dialog */}
        <PinUnlockModal
          profile={pinPromptProfile}
          enteredPin={enteredPin}
          pinError={pinError}
          isSubmitting={isSubmittingPin}
          onPinChange={(val) => {
            setEnteredPin(val);
            setPinError(null);
          }}
          onClose={() => {
            setPinPromptProfile(null);
            setEnteredPin("");
            setPinError(null);
          }}
          onSubmit={(pinCode) => {
            if (pinPromptProfile) {
              performSelectProfile(pinPromptProfile, pinCode);
            }
          }}
        />

        {/* Change Avatar Modal in Edit Profile */}
        <AvatarModal
          open={isAvatarModalOpen}
          currentAvatarUrl={editAvatar}
          onSelect={(url) => setEditAvatar(url)}
          onClose={() => setIsAvatarModalOpen(false)}
        />
      </div>
    </>
  );
}
