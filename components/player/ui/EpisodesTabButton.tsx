import { ChevronDownIcon } from "@/components/ui/icons";

interface EpisodesTabButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

/** Content of the tab that rises out of the touch control bar: drag handle, label, chevron. */
export function EpisodesTabButton({ isOpen, onClick }: EpisodesTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Episodes"
      aria-expanded={isOpen}
      className="tabbable relative flex h-full w-full cursor-pointer flex-col items-center justify-end pb-[7px] text-white active:opacity-70"
    >
      <span aria-hidden="true" className="absolute left-1/2 top-[9px] h-[3px] w-[27px] -translate-x-1/2 rounded-full bg-white/35" />
      <span className="flex items-center gap-1.5 text-[15px] font-bold leading-none">
        Episodes
        <ChevronDownIcon
          className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isOpen ? "" : "rotate-180"}`}
        />
      </span>
    </button>
  );
}
