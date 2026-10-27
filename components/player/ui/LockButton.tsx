interface LockButtonProps {
  visible: boolean;
  /** "touch" is the tall glass pill used on touch devices. */
  variant?: "default" | "touch";
  onLock: () => void;
}

const VARIANT_CLASSES = {
  default: "h-11 w-11 bg-white/10 backdrop-blur-md hover:bg-white/20",
  touch:
    "h-[72px] w-12 border border-white/15 bg-gradient-to-b from-white/[0.10] to-white/[0.02] backdrop-blur-md hover:bg-white/15",
} as const;

export function LockButton({ visible, variant = "default", onLock }: LockButtonProps) {
  return (
    <button
      type="button"
      data-player-ui
      onClick={onLock}
      aria-label="Lock screen"
      title="Lock screen"
      className={`tabbable absolute left-[max(0.75rem,env(safe-area-inset-left,0px))] top-1/2 z-30 flex -translate-y-1/2 items-center justify-center rounded-full text-white transition-[opacity,background-color,transform] duration-300 active:scale-95 ${VARIANT_CLASSES[variant]} ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" />
        <path d="M8 11V7a4 4 0 0 1 7.5-2" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </button>
  );
}
