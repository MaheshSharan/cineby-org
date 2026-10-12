import { useEffect, useRef, useState } from "react";
import { findVttThumbnailCue, parseVttThumbnails, type VttThumbnailCue } from "../utils/vttThumbnails";

export interface ProviderThumbnailPreview {
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useProviderThumbnails(vttUrl?: string | null): {
  getThumbnail: (timeSeconds: number) => ProviderThumbnailPreview | null;
  hasThumbnails: boolean;
} {
  const [cues, setCues] = useState<VttThumbnailCue[]>([]);
  const cuesRef = useRef<VttThumbnailCue[]>([]);
  cuesRef.current = cues;

  useEffect(() => {
    if (!vttUrl) {
      setCues([]);
      return;
    }

    const controller = new AbortController();

    void fetch(vttUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load thumbnail VTT");
        return res.text();
      })
      .then((text) => {
        const parsed = parseVttThumbnails(text, vttUrl);
        setCues(parsed);
      })
      .catch(() => {
        setCues([]);
      });

    return () => {
      controller.abort();
    };
  }, [vttUrl]);

  const getThumbnail = (timeSeconds: number): ProviderThumbnailPreview | null => {
    const cue = findVttThumbnailCue(cuesRef.current, timeSeconds);
    if (!cue) return null;
    return {
      url: cue.url,
      x: cue.x,
      y: cue.y,
      w: cue.w,
      h: cue.h,
    };
  };

  return {
    getThumbnail,
    hasThumbnails: cues.length > 0,
  };
}
