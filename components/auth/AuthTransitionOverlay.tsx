interface AuthTransitionOverlayProps {
  isVisible: boolean;
}

export function AuthTransitionOverlay({ isVisible }: AuthTransitionOverlayProps) {
  if (!isVisible) {
    return null;
  }

  // Covers the page between a successful sign in and the destination route being ready, so nothing flashes.
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-5 bg-background"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-2xl" />
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden="true" />
      <p className="text-sm text-white/70">Signing you in…</p>
    </div>
  );
}
