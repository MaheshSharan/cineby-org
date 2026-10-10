interface LockButtonProps {
  visible: boolean;
  onLock: () => void;
}

export function LockButton({ visible, onLock }: LockButtonProps) {
  return (
    <button
      type="button"
      data-player-ui
      onClick={onLock}
      aria-label="Lock screen"
      title="Lock screen"
      className={`tabbable absolute left-[max(0.75rem,env(safe-area-inset-left,0px))] top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-[opacity,background-color,transform] duration-300 hover:bg-white/20 active:scale-95 ${
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
        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeLinecap="round" />
      </svg>
    </button>
  );
}
