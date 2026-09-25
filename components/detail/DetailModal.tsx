import { useEffect } from "react";
import { useDetailModal } from "@/components/detail/DetailModalContext";
import { DetailPage } from "@/components/detail/DetailPage";
import { XIcon } from "@/components/ui/icons";

export function DetailModal() {
  const { isOpen, details, isLoading, error, closeDetailModal } = useDetailModal();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDetailModal();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeDetailModal]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={details?.title ? `${details.title} details` : "Content details"}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 md:bg-black/60 backdrop-blur-md transition-opacity duration-300"
        role="button"
        tabIndex={-1}
        onClick={closeDetailModal}
        aria-label="Close modal"
      />

      {/* Dialog Window */}
      <div className="relative w-[95%] md:w-full md:max-w-4xl max-h-[90vh] bg-neo-bg rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10">

        {/* Close Button */}
        <button
          type="button"
          onClick={closeDetailModal}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-50 p-2 text-white hover:text-white/80 transition-all cursor-pointer rounded-full bg-black/40 hover:bg-black/60 md:bg-white/10 md:hover:bg-white/20 border border-white/10"
        >
          <XIcon className="w-5 h-5 flex-shrink-0" />
        </button>

        {/* Scrollable Body */}
        <div className="overflow-y-auto no-scrollbar scrollbar-hide flex-1 relative z-10 bg-neo-bg">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[440px] w-full text-white/60">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
              <span className="mt-4 text-xs font-medium tracking-wide text-white/50">
                Loading details...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[380px] w-full p-8 text-center text-white/80">
              <p className="text-sm font-medium">{error}</p>
              <button
                type="button"
                onClick={closeDetailModal}
                className="mt-4 rounded-full bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          ) : details ? (
            <DetailPage
              details={details}
              isPlaying={false}
              variant="modal"
              onClose={closeDetailModal}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
