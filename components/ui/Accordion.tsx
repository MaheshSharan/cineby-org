import {
  createContext,
  useContext,
  useState,
  useId,
  ReactNode,
  useMemo,
} from "react";

type SelectionMode = "single" | "multiple";
type AccordionVariant = "default" | "surface" | "separated" | "bordered" | "ghost";

interface AccordionContextValue {
  value: string[];
  toggleItem: (itemValue: string) => void;
  variant: AccordionVariant;
  hideSeparator: boolean;
  keepMounted: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion");
  }
  return context;
}

interface ItemContextValue {
  value: string;
  isOpen: boolean;
  isDisabled: boolean;
  triggerId: string;
  contentId: string;
}

const ItemContext = createContext<ItemContextValue | null>(null);

function useItemContext() {
  const context = useContext(ItemContext);
  if (!context) {
    throw new Error("Accordion.Trigger and Accordion.Content must be used within an Accordion.Item");
  }
  return context;
}

// -------------------------------------------------------------
// Root Accordion
// -------------------------------------------------------------
export interface AccordionProps {
  children: ReactNode;
  className?: string;
  variant?: AccordionVariant;
  selectionMode?: SelectionMode;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  hideSeparator?: boolean;
  keepMounted?: boolean;
}

export function Accordion({
  children,
  className = "",
  variant = "default",
  selectionMode = "single",
  value: controlledValue,
  defaultValue,
  onValueChange,
  hideSeparator = false,
  keepMounted = false,
}: AccordionProps) {
  const [internalValue, setInternalValue] = useState<string[]>(() => {
    if (defaultValue) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
    }
    return [];
  });

  const activeValues = useMemo(() => {
    if (controlledValue !== undefined) {
      return Array.isArray(controlledValue) ? controlledValue : [controlledValue];
    }
    return internalValue;
  }, [controlledValue, internalValue]);

  const toggleItem = (itemValue: string) => {
    let next: string[];
    if (selectionMode === "single") {
      next = activeValues.includes(itemValue) ? [] : [itemValue];
    } else {
      next = activeValues.includes(itemValue)
        ? activeValues.filter((v) => v !== itemValue)
        : [...activeValues, itemValue];
    }

    if (controlledValue === undefined) {
      setInternalValue(next);
    }

    if (onValueChange) {
      onValueChange(selectionMode === "single" ? (next[0] ?? "") : next);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "surface":
        return "bg-white/[0.03] rounded-2xl border border-white/10 p-2 sm:p-3";
      case "bordered":
        return "rounded-2xl border border-white/10";
      case "separated":
        return "space-y-3";
      case "ghost":
        return "bg-transparent";
      default:
        return "divide-y divide-white/10 border-y border-white/10";
    }
  };

  return (
    <AccordionContext.Provider
      value={{
        value: activeValues,
        toggleItem,
        variant,
        hideSeparator,
        keepMounted,
      }}
    >
      <div className={`w-full ${getVariantStyles()} ${className}`}>{children}</div>
    </AccordionContext.Provider>
  );
}

// -------------------------------------------------------------
// Accordion Item
// -------------------------------------------------------------
export interface AccordionItemProps {
  children: ReactNode;
  value: string;
  className?: string;
  isDisabled?: boolean;
}

function Item({
  children,
  value,
  className = "",
  isDisabled = false,
}: AccordionItemProps) {
  const { value: activeValues, variant, hideSeparator } = useAccordionContext();
  const isOpen = activeValues.includes(value);
  const triggerId = useId();
  const contentId = useId();

  const getItemStyles = () => {
    if (variant === "separated") {
      return `rounded-2xl border transition-all duration-200 ${
        isOpen
          ? "border-white/20 bg-white/[0.05]"
          : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.03]"
      }`;
    }
    if (!hideSeparator && variant !== "default") {
      return "border-b border-white/5 last:border-b-0";
    }
    return "";
  };

  return (
    <ItemContext.Provider
      value={{
        value,
        isOpen,
        isDisabled,
        triggerId,
        contentId,
      }}
    >
      <div className={`overflow-hidden transition-colors ${getItemStyles()} ${className}`}>
        {children}
      </div>
    </ItemContext.Provider>
  );
}

// -------------------------------------------------------------
// Accordion Trigger
// -------------------------------------------------------------
export interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

function Trigger({
  children,
  className = "",
  onClick,
}: AccordionTriggerProps) {
  const { toggleItem } = useAccordionContext();
  const { value, isOpen, isDisabled, triggerId, contentId } = useItemContext();

  const handleClick = () => {
    if (isDisabled) return;
    onClick?.();
    toggleItem(value);
  };

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={isOpen}
      aria-controls={contentId}
      disabled={isDisabled}
      onClick={handleClick}
      className={`flex w-full items-center justify-between gap-4 py-4 px-2 sm:px-4 text-left font-medium transition-colors text-white hover:text-white/90 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

// -------------------------------------------------------------
// Accordion Title
// -------------------------------------------------------------
export function AccordionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`text-sm sm:text-base font-medium leading-snug tracking-tight text-white/90 ${className}`}>
      {children}
    </span>
  );
}

// -------------------------------------------------------------
// Accordion Indicator (Chevron with rotation)
// -------------------------------------------------------------
export function AccordionIndicator({ className = "" }: { className?: string }) {
  const { isOpen } = useItemContext();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 text-white/50 transition-transform duration-200 ease-out ${
        isOpen ? "rotate-180 text-white" : ""
      } ${className}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// -------------------------------------------------------------
// Accordion Content
// -------------------------------------------------------------
export interface AccordionContentProps {
  children: ReactNode;
  className?: string;
  keepMounted?: boolean;
}

function Content({
  children,
  className = "",
  keepMounted: itemKeepMounted,
}: AccordionContentProps) {
  const { keepMounted: rootKeepMounted } = useAccordionContext();
  const { isOpen, triggerId, contentId } = useItemContext();

  const shouldKeep = itemKeepMounted ?? rootKeepMounted;

  if (!isOpen && !shouldKeep) {
    return null;
  }

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      hidden={!isOpen && shouldKeep}
      className={`px-2 sm:px-4 pb-4 pt-1 text-xs sm:text-sm leading-relaxed text-white/60 transition-all ${
        !isOpen && shouldKeep ? "hidden" : "block"
      } ${className}`}
    >
      {children}
    </div>
  );
}

Accordion.Item = Item;
Accordion.Trigger = Trigger;
Accordion.Title = AccordionTitle;
Accordion.Indicator = AccordionIndicator;
Accordion.Content = Content;
