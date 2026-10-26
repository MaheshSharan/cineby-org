import type { AdAnalyticsEvent } from "@/lib/ads/analyticsEvents";
import { getGaMeasurementId, isAnalyticsEnabled } from "@/lib/env/public";

/** GA4 measurement ID, or null while analytics is explicitly disabled (NEXT_PUBLIC_ENABLE_ANALYTICS=false). */
export function getActiveGaMeasurementId(): string | null {
  return isAnalyticsEnabled() ? getGaMeasurementId() : null;
}

export type GTagEvent =
  | {
      action: "page_view";
      params: {
        page_path: string;
        page_title?: string;
      };
    }
  | {
      action: "media_start";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        title: string;
        season?: number;
        episode?: number;
      };
    }
  | {
      action: "media_play";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        current_time: number;
      };
    }
  | {
      action: "media_pause";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        current_time: number;
      };
    }
  | {
      action: "media_milestone";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        milestone: 25 | 50 | 75 | 90 | 100;
        duration: number;
        title?: string;
      };
    }
  | {
      action: "media_buffering_start";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        current_time: number;
      };
    }
  | {
      action: "media_buffering_end";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        buffer_duration_ms: number;
      };
    }
  | {
      action: "stream_error";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        provider?: string;
        error_message: string;
      };
    }
  | {
      action: "embed_not_available";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        title: string;
      };
    }
  | {
      action: "subtitle_toggle";
      params: {
        language: string;
        enabled: boolean;
      };
    }
  | {
      action: "quality_change";
      params: {
        resolution: string;
      };
    }
  | {
      action: "search_query";
      params: {
        query: string;
        result_count: number;
        execution_time_ms?: number;
      };
    }
  | {
      action: "search_result_select";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        title: string;
        position?: number;
      };
    }
  | {
      action: "watchlist_add";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        title: string;
      };
    }
  | {
      action: "watchlist_remove";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
      };
    }
  | {
      action: "share_click";
      params: {
        content_id: string;
        media_type: "movie" | "tv";
        method: "clipboard" | "web_share";
      };
    }
  | {
      action: "web_vitals";
      params: {
        metric_name: "CLS" | "FCP" | "FID" | "INP" | "LCP" | "TTFB";
        value: number;
        rating: "good" | "needs-improvement" | "poor";
        metric_id: string;
      };
    }
  | {
      action: "system_exception";
      params: {
        error_type: string;
        message: string;
        fatal?: boolean;
      };
    }
  | AdAnalyticsEvent;

export interface UserProperties {
  auth_status?: "authenticated" | "guest";
  theme_mode?: "light" | "dark";
  network_type?: string;
}

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event" | "consent" | "set",
      targetIdOrAction: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export function isAnalyticsActive(): boolean {
  return typeof window !== "undefined" && isAnalyticsEnabled();
}

export function pageView(url: string, title?: string): void {
  if (!isAnalyticsActive() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("config", getGaMeasurementId(), {
    page_path: url,
    page_title: title || (typeof document !== "undefined" ? document.title : ""),
  });
}

export function trackEvent<T extends GTagEvent>(event: T): void {
  if (!isAnalyticsActive() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", event.action, event.params as Record<string, unknown>);
}

export function setUserProperties(properties: UserProperties): void {
  if (!isAnalyticsActive() || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("set", "user_properties", properties as Record<string, unknown>);
}
