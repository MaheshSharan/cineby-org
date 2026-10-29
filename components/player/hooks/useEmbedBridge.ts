import { useEffect, useRef } from "react";
import type { EmbedNormalizedEvent } from "@/lib/embeds/types";
import { getEmbedProvider } from "@/lib/embeds/registry";

interface UseEmbedBridgeOptions {
  serverId: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onEvent?: (event: EmbedNormalizedEvent) => void;
}

export function useEmbedBridge({
  serverId,
  iframeRef,
  onTimeUpdate,
  onEnded,
  onEvent,
}: UseEmbedBridgeOptions) {
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onEndedRef = useRef(onEnded);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onEndedRef.current = onEnded;
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const provider = getEmbedProvider(serverId);
    if (!provider) return;

    function handleWindowMessage(e: MessageEvent) {
      // 1. Origin verification
      if (!provider || !provider.allowedOrigins.includes(e.origin)) {
        return;
      }

      // 2. Source window verification
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) {
        return;
      }

      // 3. Parse and normalize
      const parsed = provider.parseEvent(e.origin, e.data);
      if (!parsed) return;

      onEventRef.current?.(parsed);

      if (parsed.event === "timeupdate" && typeof parsed.currentTime === "number") {
        onTimeUpdateRef.current?.(parsed.currentTime, parsed.duration ?? 0);
      } else if (parsed.event === "ended") {
        onEndedRef.current?.();
      }
    }

    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [serverId, iframeRef]);
}
