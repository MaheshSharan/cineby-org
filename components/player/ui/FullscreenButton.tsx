interface FullscreenButtonProps {
  onClick: () => void;
}

export function FullscreenButton({ onClick }: FullscreenButtonProps) {
  return (
    <button
      type="button"
      id="ButtonFullscreen"
      onClick={onClick}
      aria-label="Fullscreen"
      title="Fullscreen (f)"
      className="tabbable p-2 rounded-full hover:bg-white/20 transition-transform duration-100 flex items-center gap-3 active:scale-110 active:bg-white/30 active:text-white"
    >
      <span className="text-3xl md:text-2xl flex items-center justify-center w-[1em] h-[1em]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          viewBox="0 0 448 512"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM32 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64v-64c0-17.7-14.3-32-32-32zM416 320c-17.7 0-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32v-96c0-17.7-14.3-32-32-32z"
          />
        </svg>
      </span>
    </button>
  );
}
