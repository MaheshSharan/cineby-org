const TOUCH_CONTAINER_CLASSES =
  "flex h-12 flex-shrink-0 items-center rounded-full border border-white/15 bg-black/35 px-1.5 backdrop-blur-md";
const DEFAULT_CONTAINER_CLASSES = "flex items-center gap-1 md:gap-4 flex-shrink-0 relative";

/** Touch devices group the header actions in one glass pill, separated by dividers. */
export function getHeaderActionsClass(isTouch: boolean): string {
  return isTouch ? `${TOUCH_CONTAINER_CLASSES} relative` : DEFAULT_CONTAINER_CLASSES;
}

export function getHeaderActionClass(isTouch: boolean, isOpen: boolean): string {
  if (isTouch) {
    return `tabbable flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10 md:px-4 ${
      isOpen ? "bg-white/15" : ""
    }`;
  }

  return `tabbable flex items-center gap-2 p-2 md:px-3 md:py-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold ${
    isOpen ? "bg-white/20 text-white" : ""
  }`;
}
