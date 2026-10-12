import { useServiceWorker } from "@/hooks/useServiceWorker";

export function UpdateToast() {
  const { isUpdateReady } = useServiceWorker();

  if (!isUpdateReady) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-[9999] mx-auto flex max-w-[380px] items-center justify-between gap-3 rounded-2xl border border-white/[0.12] bg-[#07090e]/90 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
    >
      <p className="text-sm text-white">A new version is available.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground active:scale-95"
      >
        Refresh
      </button>
    </div>
  );
}
