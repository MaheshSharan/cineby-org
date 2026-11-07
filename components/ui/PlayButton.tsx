import Link from "next/link";
import * as React from "react";
import { PlayIcon } from "@/components/ui/icons";

export interface PlayButtonProps extends React.ButtonHTMLAttributes<HTMLElement> {
  href?: string;
  label?: string;
  size?: "sm" | "md" | "lg" | "iconSm" | "icon" | "iconLg";
  iconOnly?: boolean;
}

export const PlayButton = React.forwardRef<HTMLElement, PlayButtonProps>(
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
      iconSm: "h-9 w-9 min-w-0 px-0",
      icon: "h-11 w-11 md:h-12 md:w-12 min-w-0 px-0",
      iconLg: "h-14 w-14 min-w-0 px-0",
    }[size];

    const iconSizes = {
      sm: 16,
      md: 20,
      lg: 22,
      iconSm: 18,
      icon: 20,
      iconLg: 22,
    }[size];

    const baseClasses = `relative inline-flex items-center justify-center rounded-full bg-white font-bold tracking-wide text-[#05070a] shadow-xl shadow-black/10 transition-all duration-200 hover:scale-105 hover:bg-white/95 active:scale-95 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer ${sizeClasses} ${className}`;

    const innerContent = (
      <>
        <PlayIcon size={iconSizes} className="fill-current text-[#05070a] shrink-0" />
        {!iconOnly ? <span>{label}</span> : null}
      </>
    );

    if (href) {
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
          className={baseClasses}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {innerContent}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
        className={baseClasses}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {innerContent}
      </button>
    );
  }
);

PlayButton.displayName = "PlayButton";
