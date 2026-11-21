import { useEffect, useRef } from "react";
import type { EmbedNormalizedEvent } from "@/lib/embeds/types";
import { getEmbedProvider } from "@/lib/embeds/registry";
import { isOriginAllowed } from "@/lib/embeds/common";

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
  const durationRef = useRef<number>(0);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
    onEndedRef.current = onEnded;
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    const provider = getEmbedProvider(serverId);
    if (!provider) return;

    function handleWindowMessage(e: MessageEvent) {
      if (!provider) return;

      // 1. Origin verification
      if (!isOriginAllowed(e.origin, provider.allowedOrigins)) {
        return;
      }

      // 2. Source window verification:
      // Allow if source is directly our iframe window OR if the event arrives from an allowed
      // origin (handles nested child iframes from upstream streaming CDNs like vixcloud.co).
      if (
        iframeRef.current?.contentWindow &&
        e.source &&
        e.source !== iframeRef.current.contentWindow &&
        !isOriginAllowed(e.origin, provider.allowedOrigins)
      ) {
        return;
      }

      // 3. Parse and normalize
      const parsed = provider.parseEvent(e.origin, e.data);
      if (!parsed) return;

      onEventRef.current?.(parsed);

      if (typeof parsed.duration === "number" && parsed.duration > 0) {
        durationRef.current = parsed.duration;
      }

      if (typeof parsed.currentTime === "number") {
        const effectiveDuration =
          typeof parsed.duration === "number" && parsed.duration > 0
            ? parsed.duration
            : durationRef.current;
        onTimeUpdateRef.current?.(parsed.currentTime, effectiveDuration);
      }

      if (parsed.event === "ended" || parsed.event === "next") {
        onEndedRef.current?.();
      }
    }

    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [serverId, iframeRef]);
}
