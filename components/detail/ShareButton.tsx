import { useState } from "react";
import { CheckIcon, Share2Icon } from "@/components/ui/icons";
import { trackEvent } from "@/lib/analytics/gtag";
import { buildShareUrl } from "@/lib/utils/share";

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  className?: string;
  onToast?: (message: string) => void;
}

/**
 * Clean, lightweight Share button supporting native Web Share API
 * with automatic fallback to clipboard copy.
 */
export function ShareButton({
  title,
  text,
  url,
  className = "",
  onToast,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const taggedUrl = buildShareUrl(url);
    const fullUrl = taggedUrl.startsWith("http")
      ? taggedUrl
      : `${window.location.origin}${taggedUrl.startsWith("/") ? taggedUrl : `/${taggedUrl}`}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text ?? `Watch ${title} on Cineby`,
          url: fullUrl,
        });
        trackEvent({
          action: "share_click",
          params: {
            content_id: url,
            media_type: url.includes("/tv") ? "tv" : "movie",
            method: "web_share",
          },
        });
        return;
      } catch (err) {
        // AbortError is thrown when the user closes the native share sheet; safely ignore
        if ((err as Error)?.name === "AbortError") {
          return;
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      trackEvent({
        action: "share_click",
        params: {
          content_id: url,
          media_type: url.includes("/tv") ? "tv" : "movie",
          method: "clipboard",
        },
      });

      setCopied(true);
      onToast?.("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast?.("Failed to copy link");
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "Link copied" : "Share title"}
      title={copied ? "Copied!" : "Share"}
      className={`flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-[20px] shadow-lg shadow-black/5 transition-all duration-200 hover:scale-105 hover:border-white/20 active:scale-95 focus:outline-none ${className}`}
    >
      {copied ? (
        <CheckIcon size={19} className="stroke-[2.5] text-primary" />
      ) : (
        <Share2Icon size={18} className="stroke-[2]" />
      )}
    </button>
  );
}
