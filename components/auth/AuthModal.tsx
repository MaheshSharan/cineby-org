import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthBackdrop, AuthMobileBanner } from "@/components/auth/AuthBackdrop";
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserRoundIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import type { AuthModalProps, AuthMode } from "@/components/auth/types";
import { handleGoogleCredentialResponse } from "@/components/auth/GoogleOneTap";

export type { AuthMode } from "@/components/auth/types";


export function AuthModal({
  open,
  mode,
  onClose,
  onModeChange,
  onAuthenticated,
  showToast,
}: AuthModalProps) {
  const router = useRouter();
  const [internalMode, setInternalMode] = useState<AuthMode>(mode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInternalMode(mode);
  }, [mode]);

  const activeMode = internalMode;

  const handleClose = useCallback(() => {
    onClose(activeMode);
    if (router.pathname === "/login" || router.pathname === "/register") {
      router.push("/", undefined, { shallow: true });
    }
  }, [activeMode, onClose, router]);

  useBodyScrollLock(open);

  const onAuthenticatedRef = useRef(onAuthenticated);
  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated;
  }, [onAuthenticated]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const setupGoogleBtn = () => {
      if (cancelled || !googleBtnContainerRef.current || typeof window === "undefined" || !window.google?.accounts?.id) return;
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) return;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response.credential) {
              handleGoogleCredentialResponse(
                response.credential,
                async (redirectTo) => {
                  showToast("Signed in with Google");
                  await onAuthenticatedRef.current(redirectTo || "/profiles");
                  onClose(activeMode);
                },
                (err) => {
                  setError(err);
                }
              );
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
            type: "standard",
            theme: "filled_black",
            size: "large",
            width: 380,
            text: "continue_with",
            shape: "pill",
          });
        }
      } catch {
        // Safe catch if Google SDK fails to initialize
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogleBtn();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          setupGoogleBtn();
        }
      }, 100);
      const timer = setTimeout(() => clearInterval(interval), 4000);
      return () => {
        cancelled = true;
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    const timer = setTimeout(setupGoogleBtn, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, activeMode, onClose, router, showToast]);

  useEffect(() => {
    if (!open) {
      setUsername("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setAgreedToTerms(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  const handleTabChange = (newMode: AuthMode) => {
    setInternalMode(newMode);
    onModeChange(newMode);
    setError(null);
    if (router.pathname === "/login" || router.pathname === "/register") {
      const newPath = newMode === "login" ? "/login" : "/register";
      if (router.pathname !== newPath) {
        router.push(newPath, undefined, { shallow: true });
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (activeMode === "register" && !agreedToTerms) {
      setError("Please agree to the Terms of Service to create an account.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = activeMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        activeMode === "login"
          ? { username, password }
          : { username, email, password, displayName: username };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; redirectTo?: string };

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (activeMode === "register") {
        showToast("Registered successfully!");
        // Navigate while the full-screen modal still covers the page, then
        // close it — closing first would flash the home page underneath.
        await onAuthenticated(data.redirectTo || "/profiles?create=true");
      } else {
        showToast(`${username}, welcome back!`);
        await onAuthenticated(data.redirectTo || "/profiles");
      }
      onClose(activeMode);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeMode === "login" ? "Login" : activeMode === "register" ? "Sign up" : "Reset Password"}
      className="fixed inset-0 z-[200] overflow-hidden bg-[#05070a] text-white animate-in fade-in duration-200"
    >
      {/* Background Dots Pattern */}
      <div className="auth-dots" aria-hidden="true" />

      {/* Top Left Back Button (Exact Movy SVG & Position) */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={handleClose}
        className="absolute left-4 top-5 z-30 text-white/80 transition-colors hover:text-white md:left-8 md:top-11 cursor-pointer"
      >
        <svg
          width="22"
          height="14"
          viewBox="0 0 22 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 1.5 1.5 7 7 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 7h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden lg:flex-row">
        {/* Mobile Banner Marquee (Top) */}
        <AuthMobileBanner />


        {/* Left Side: Auth Form Area */}
        <div className="relative z-20 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto no-scrollbar px-6 py-12 sm:px-12 lg:px-16">
          <div className="w-full max-w-[400px]">
            {/* Header Titles */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl 2xl:text-3xl">
                {activeMode === "login" ? "Log in to Cineby" : "Create your Cineby account"}
              </h2>
              <p className="mt-1.5 text-[13px] text-white/50">
                {activeMode === "login" ? "Enter your credentials to continue" : "Fill in your details to get started"}
              </p>
            </div>

            {/* Google Custom Button with native click target */}
            <div className="relative mb-4">
              <div
                className="h-10 md:h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.10] text-[13px] font-semibold text-white transition-colors flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </div>

              {/* Native Google GIS click target */}
              <div
                ref={googleBtnContainerRef}
                className="absolute inset-0 opacity-[0.0001] overflow-hidden cursor-pointer flex items-center justify-center [&_iframe]:w-full [&_iframe]:h-full"
              />
            </div>

            {/* Divider */}
            <div className="relative mb-5 flex items-center justify-center">
              <div className="w-full border-t border-white/[0.08]" />
              <span className="absolute bg-[#05070a] px-2 text-[11px] font-medium uppercase tracking-wider text-white/40">
                or
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col justify-center">
              {/* Username input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                  <UserRoundIcon size={16} />
                </span>
                <input
                  type="text"
                  placeholder={activeMode === "login" ? "Username or Email" : "Username"}
                  minLength={3}
                  maxLength={60}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 md:h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-[13px] text-white outline-none placeholder:text-white/40 transition-colors focus:border-white/[0.14] focus:bg-white/[0.05]"
                />
              </div>

              {/* Email input (register mode) */}
              {activeMode === "register" && (
                <div className="relative mt-3">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <MailIcon size={16} />
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    maxLength={254}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 md:h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-4 text-[13px] text-white outline-none placeholder:text-white/40 transition-colors focus:border-white/[0.14] focus:bg-white/[0.05]"
                  />
                </div>
              )}

              {/* Password input */}
              <div className="relative mt-3">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30">
                  <LockIcon size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  minLength={8}
                  maxLength={32}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 md:h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-11 pr-11 text-[13px] text-white outline-none placeholder:text-white/40 transition-colors focus:border-white/[0.14] focus:bg-white/[0.05]"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-white/30 transition-colors hover:text-white/60 cursor-pointer"
                >
                  {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>

              {/* Terms of Service Checkbox (Register mode) */}
              {activeMode === "register" && (
                <div className="mt-3.5 flex items-start gap-2.5 px-0.5 text-left">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={agreedToTerms}
                    onClick={() => setAgreedToTerms((prev) => !prev)}
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                      agreedToTerms
                        ? "bg-white border-white text-black"
                        : "border-white/25 bg-white/[0.04] hover:border-white/50"
                    }`}
                  >
                    {agreedToTerms && <CheckIcon size={12} strokeWidth={3} />}
                  </button>
                  <label
                    onClick={() => setAgreedToTerms((prev) => !prev)}
                    className="text-[12px] leading-tight text-white/60 select-none cursor-pointer"
                  >
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-white underline underline-offset-2 hover:text-white/90"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-white underline underline-offset-2 hover:text-white/90"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
              )}

              {/* Error display */}
              {error && (
                <p role="alert" className="text-center text-xs text-primary font-medium mt-2">
                  {error}
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (activeMode === "register" && !agreedToTerms)}
                className="mt-4 h-10 md:h-11 w-full rounded-xl bg-white text-[13px] font-semibold text-[#0b0f14] transition-colors hover:bg-white/90 disabled:opacity-50 cursor-pointer flex items-center justify-center"
              >
                {isSubmitting ? (
                  <Spinner size="sm" className="text-[#0b0f14]" />
                ) : (
                  <span className="inline-block">
                    {activeMode === "login"
                      ? "Login"
                      : "Sign up"}
                  </span>
                )}
              </button>

              <p className="mt-2 text-center text-xs text-white/40">Password recovery is available from account settings.</p>

              {/* Mode Switcher */}
              <p className="text-center text-white/50 mt-3 text-[12.5px] md:mt-4 md:text-[13px]">
                {activeMode === "register" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => handleTabChange("login")}
                      className="font-semibold text-white transition-colors hover:underline cursor-pointer"
                    >
                      Login
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => handleTabChange("register")}
                      className="font-semibold text-white transition-colors hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>

              {/* Disclaimer */}
              <p className="text-center text-[11px] text-white/30 mt-6">
                By continuing you agree to our Terms, Privacy and DMCA.
              </p>
            </form>
          </div>
        </div>

        {/* Right Side: Poster Rolling Wall (Desktop) */}
        <AuthBackdrop />
      </div>
    </div>
  );
}

