import Link from "next/link";
import * as React from "react";
import { PlayIcon } from "@/components/ui/icons";

export interface PlayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
}

export const PlayButton = React.forwardRef<HTMLButtonElement, PlayButtonProps>(
  (
    {
      href,
      label = "Play",
      size = "md",
      iconOnly = false,
      className = "",
      onClick,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-9 px-4 text-sm gap-2",
      md: "h-11 md:h-12 px-6 text-base font-bold min-w-[120px] md:min-w-[130px] gap-2.5",
      lg: "h-[52px] px-7 text-lg font-bold min-w-[140px] gap-2.5",
    }[size];

    const iconSizes = {
      sm: 16,
      md: 20,
      lg: 22,
    }[size];

    const buttonContent = (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={`relative inline-flex items-center justify-center rounded-full bg-white font-bold tracking-wide text-[#05070a] shadow-xl shadow-black/10 transition-all duration-200 hover:scale-105 hover:bg-white/95 active:scale-95 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer ${sizeClasses} ${className}`}
        {...props}
      >
        <PlayIcon size={iconSizes} className="fill-current text-[#05070a] shrink-0" />
        {!iconOnly ? <span>{label}</span> : null}
      </button>
    );

    if (href) {
      return (
        <Link href={href} className="inline-flex" tabIndex={-1}>
          {buttonContent}
        </Link>
      );
    }

    return buttonContent;
  }
);

PlayButton.displayName = "PlayButton";
