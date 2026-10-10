import { useRouter } from "next/router";
import { useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { AvatarModal } from "@/components/profile/AvatarModal";
import { LockIcon, PencilIcon, TrashIcon, UserRoundIcon, XIcon } from "@/components/ui/icons";

export function AccountSettings() {
  const router = useRouter();
  const { user, openAuthModal, showToast, refresh, logout } = useAuth();
  const { activeProfile, refreshProfile } = useActiveProfile();

  // Modals state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  // Form states
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // If not logged in
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">Account</h2>
          <p className="mt-1 text-sm text-white/50">
            Sign in to sync your settings and watch progress across devices.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <h3 className="text-base font-semibold text-white">Not signed in</h3>
              <p className="mt-1 text-sm text-white/50">
                Create an account or sign in to sync your data
              </p>
            </div>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors shadow-sm cursor-pointer self-start sm:self-auto"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle avatar select
  const handleAvatarSelect = async (avatarUrl: string) => {
    try {
      if (activeProfile) {
        const response = await fetch(`/api/profiles/${activeProfile.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: activeProfile.name, avatarUrl }),
        });
        if (!response.ok) throw new Error("Failed to update profile avatar");
      } else {
        const response = await fetch("/api/auth/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: avatarUrl }),
        });
        if (!response.ok) throw new Error("Failed to update avatar");
      }

      await refresh();
      refreshProfile();
      setIsAvatarModalOpen(false);
      showToast("Avatar updated successfully");
    } catch {
      showToast("Unable to save avatar. Please try again.");
    }
  };

  // Handle display name change
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSavingName(true);
    setNameError(null);

    try {
      const res = await fetch("/api/auth/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newName.trim() }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setNameError(data.error || "Failed to update name");
        return;
      }

      await refresh();
      setIsEditNameOpen(false);
      setNewName("");
      showToast("Username updated successfully");
    } catch {
      setNameError("A network error occurred. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  // Handle password change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password");
        return;
      }

      setIsChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password updated successfully");
    } catch {
      setPasswordError("A network error occurred. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword) return;

    setIsDeletingAccount(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete account");
        return;
      }

      setIsDeleteAccountOpen(false);
      await logout();
      showToast("Account deleted successfully");
      router.push("/");
    } catch {
      setDeleteError("A network error occurred. Please try again.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const currentAvatar = activeProfile?.avatarUrl || user.avatarUrl || "/avatar/classic-1.png";
  const displayName = activeProfile?.name || user.displayName || user.email.split("@")[0];
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white">Account</h2>
        <p className="mt-1 text-sm text-white/50">
          Manage your account and sync data across devices.
        </p>
      </div>

      {/* Main Account Card */}
      <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-8 backdrop-blur-md divide-y divide-white/[0.07]">
        {/* Profile overview row */}
        <div className="pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden ring-2 ring-white/15 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentAvatar}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{displayName}</h3>
                {activeProfile && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/10 text-white/70">
                    Profile
                  </span>
                )}
              </div>
              <p className="text-sm text-white/50 mt-0.5">{user.email}</p>
              {memberSince && (
                <p className="text-xs text-white/40 mt-1">Member since {memberSince}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <UserRoundIcon size={14} className="text-white/60" />
              <span>Change Avatar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewName(user.displayName || "");
                setIsEditNameOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <PencilIcon size={13} className="text-white/60" />
              <span>Change Name</span>
            </button>
          </div>
        </div>

        {/* Security / Password row */}
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Password</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Keep your account secure with a strong password.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <LockIcon size={14} className="text-white/80" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Sign out row */}
        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Sign Out</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Log out of this device.
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Delete Account</h3>
            <p className="mt-1 text-sm text-white/50 max-w-lg">
              Permanently delete your account, saved watchlist items, and watch progress. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeletePassword("");
              setDeleteError(null);
              setIsDeleteAccountOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:border-red-500/50 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shrink-0"
          >
            <TrashIcon size={14} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AvatarModal
        open={isAvatarModalOpen}
        currentAvatarUrl={currentAvatar}
        onSelect={handleAvatarSelect}
        onClose={() => setIsAvatarModalOpen(false)}
      />

      {/* Change Name Modal */}
      {isEditNameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#14161a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Change Name</h3>
              <button
                type="button"
                onClick={() => setIsEditNameOpen(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              {nameError && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                  {nameError}
                </div>
              )}

              <div>
                <label htmlFor="displayName" className="block text-xs font-medium text-white/70 mb-1.5">
                  Display Name / Username
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditNameOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingName || !newName.trim()}
                  className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {isSavingName ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#14161a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Change Password</h3>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              {passwordError && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                  {passwordError}
                </div>
              )}

              <div>
                <label htmlFor="currentPassword" className="block text-xs font-medium text-white/70 mb-1.5">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-xs font-medium text-white/70 mb-1.5">
                  New Password (min 8 characters)
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-white/70 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPassword || !currentPassword || !newPassword}
                  className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-colors disabled:opacity-50"
                >
                  {isSavingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#160c0d] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-400">Delete Account</h3>
              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>

            <p className="text-sm text-white/70 mb-4">
              Are you sure you want to permanently delete your account? Please enter your current password to confirm.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {deleteError && (
                <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-400">
                  {deleteError}
                </div>
              )}

              <div>
                <label htmlFor="deletePasswordInput" className="block text-xs font-medium text-white/70 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="deletePasswordInput"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-red-500/30 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-white/70 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount || !deletePassword}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold text-xs hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeletingAccount ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
