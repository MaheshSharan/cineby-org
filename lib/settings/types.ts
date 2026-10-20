export type SiteTheme = "default" | "emerald" | "cyan" | "amber" | "rose" | "purple";
export type EpisodeViewStyle = "carousel" | "vertical";
export type DetailViewType = "page" | "modal";

export type SubtitleFont = "cineby" | "netflix" | "montserrat";

export interface SubtitleColorPreset {
  value: string;
  label: string;
}

export const SUBTITLE_COLOR_PRESETS: readonly SubtitleColorPreset[] = [
  { value: "#ffffff", label: "White" },
  { value: "#80b1fa", label: "Blue" },
  { value: "#e2e535", label: "Yellow" },
  { value: "#10b981", label: "Green" },
];

export interface SubtitleFontOption {
  id: SubtitleFont;
  label: string;
  className: string;
}

export const SUBTITLE_FONT_OPTIONS: readonly SubtitleFontOption[] = [
  { id: "cineby", label: "Cineby", className: "font-sans font-medium" },
  { id: "netflix", label: "Netflix", className: "font-['Netflix_Sans',sans-serif] tracking-wide" },
  { id: "montserrat", label: "Montserrat", className: "font-['Montserrat',sans-serif]" },
];

export function resolveSubtitleColor(color?: string | null, pastelMode = false): string {
  const c = color || "#ffffff";
  if (!pastelMode) return c;

  if (c === "#ffffff" || c === "white") return "#f1f5f9";
  if (c === "#80b1fa" || c === "cyan") return "#bfdbfe";
  if (c === "#e2e535" || c === "yellow") return "#fef9c3";
  if (c === "#10b981" || c === "green") return "#bbf7d0";
  if (c === "#f472b6" || c === "magenta") return "#fbcfe8";
  return c;
}

export function getSubtitleFontClass(font?: SubtitleFont | null): string {
  const match = SUBTITLE_FONT_OPTIONS.find((opt) => opt.id === font);
  return match?.className ?? "font-sans font-medium";
}

export interface AppearanceSettings {
  theme: SiteTheme;
  episodeViewStyle: EpisodeViewStyle;
  detailViewType: DetailViewType;
  useImageLogos: boolean;
  trailers: boolean;
}

export interface PlaybackSettings {
  autoplay: boolean;
  autoSkipIntro: boolean;
  seekTime: number; // 5, 10, 15, 30 seconds
  autoSubtitles: boolean;
  preferredLanguage: string;
  hoverThumbnails: boolean;
}

export interface SubtitlesSettings {
  font: SubtitleFont;
  textSize: number; // 50 to 200 percent
  textColor: string; // Hex string or preset
  backgroundBlur: boolean;
  position: number; // 0 to 50
  delay: number; // -20 to +20 seconds
  useNative: boolean;
  pastelMode: boolean;
  autoSync: boolean; // one-click subtitle auto-sync in the player
}

export interface CinebySettings {
  appearance: AppearanceSettings;
  playback: PlaybackSettings;
  subtitles: SubtitlesSettings;
}

export const DEFAULT_SETTINGS: CinebySettings = {
  appearance: {
    theme: "default",
    episodeViewStyle: "vertical",
    detailViewType: "page",
    useImageLogos: true,
    trailers: true,
  },
  playback: {
    autoplay: true,
    autoSkipIntro: false,
    seekTime: 10,
    autoSubtitles: true,
    preferredLanguage: "en",
    hoverThumbnails: false,
  },
  subtitles: {
    font: "cineby",
    textSize: 100,
    textColor: "#ffffff",
    backgroundBlur: true,
    position: 0,
    delay: 0,
    useNative: false,
    pastelMode: false,
    autoSync: true,
  },
};

const VALID_THEMES: readonly SiteTheme[] = ["default", "emerald", "cyan", "amber", "rose", "purple"];
const VALID_DETAIL_VIEWS: readonly DetailViewType[] = ["page", "modal"];
const VALID_FONTS: readonly SubtitleFont[] = ["cineby", "netflix", "montserrat"];

/**
 * Serializes CinebySettings into an API-friendly response object.
 * Exposes Cinejoy flat property keys alongside Cineby nested objects.
 */
export function toApiSettingsResponse(settings: CinebySettings): Record<string, unknown> {
  return {
    // Cinejoy flat compatibility
    theme: settings.appearance.theme,
    episodeViewStyle: settings.appearance.episodeViewStyle,
    detailViewType: settings.appearance.detailViewType,
    useImageLogos: settings.appearance.useImageLogos,
    trailersEnabled: settings.appearance.trailers,
    trailers: settings.appearance.trailers,
    autoplay: settings.playback.autoplay,
    autoSkipIntro: settings.playback.autoSkipIntro,
    seekTime: settings.playback.seekTime,
    autoSubtitles: settings.playback.autoSubtitles,
    hoverThumbnails: settings.playback.hoverThumbnails,
    defaultSubtitleLanguage: settings.playback.preferredLanguage,
    preferredLanguage: settings.playback.preferredLanguage,
    subtitleFont: settings.subtitles.font,
    subtitleSize: settings.subtitles.textSize,
    textSize: settings.subtitles.textSize,
    subtitleColor: settings.subtitles.textColor,
    textColor: settings.subtitles.textColor,
    subtitleBackground: settings.subtitles.backgroundBlur,
    backgroundBlur: settings.subtitles.backgroundBlur,
    subtitlePosition: settings.subtitles.position,
    position: settings.subtitles.position,
    subtitleDelay: settings.subtitles.delay,
    delay: settings.subtitles.delay,
    useNativeSubtitles: settings.subtitles.useNative,
    useNative: settings.subtitles.useNative,
    pastelMode: settings.subtitles.pastelMode,
    autoSync: settings.subtitles.autoSync,

    // Cineby structured namespaces
    appearance: settings.appearance,
    playback: settings.playback,
    subtitles: settings.subtitles,
  };
}

/**
 * Normalizes an unknown payload (flat, nested, or partial) into a validated CinebySettings object.
 */
export function normalizeApiSettings(payload: unknown): CinebySettings {
  if (!payload || typeof payload !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  const raw = payload as Record<string, unknown>;
  const rawAppearance = (raw.appearance && typeof raw.appearance === "object" ? raw.appearance : {}) as Record<string, unknown>;
  const rawPlayback = (raw.playback && typeof raw.playback === "object" ? raw.playback : {}) as Record<string, unknown>;
  const rawSubtitles = (raw.subtitles && typeof raw.subtitles === "object" ? raw.subtitles : {}) as Record<string, unknown>;

  // Theme
  const themeCandidate = (rawAppearance.theme ?? raw.theme) as string | undefined;
  const theme: SiteTheme = VALID_THEMES.includes(themeCandidate as SiteTheme)
    ? (themeCandidate as SiteTheme)
    : DEFAULT_SETTINGS.appearance.theme;

  // Episode view style: "vertical" is default, "carousel" is horizontal row
  const episodeStyleCandidate = (rawAppearance.episodeViewStyle ?? raw.episodeViewStyle) as string | undefined;
  let episodeViewStyle: EpisodeViewStyle = DEFAULT_SETTINGS.appearance.episodeViewStyle;
  if (episodeStyleCandidate === "carousel") {
    episodeViewStyle = "carousel";
  } else if (
    episodeStyleCandidate === "vertical" ||
    episodeStyleCandidate === "grid" ||
    episodeStyleCandidate === "default"
  ) {
    episodeViewStyle = "vertical";
  }

  // Detail view type
  const detailCandidate = (rawAppearance.detailViewType ?? raw.detailViewType) as string | undefined;
  const detailViewType: DetailViewType = VALID_DETAIL_VIEWS.includes(detailCandidate as DetailViewType)
    ? (detailCandidate as DetailViewType)
    : DEFAULT_SETTINGS.appearance.detailViewType;

  // Use image logos
  const useImageLogos = typeof rawAppearance.useImageLogos === "boolean"
    ? rawAppearance.useImageLogos
    : typeof raw.useImageLogos === "boolean"
    ? raw.useImageLogos
    : DEFAULT_SETTINGS.appearance.useImageLogos;

  // Trailers
  const trailers = typeof rawAppearance.trailers === "boolean"
    ? rawAppearance.trailers
    : typeof raw.trailersEnabled === "boolean"
    ? raw.trailersEnabled
    : typeof raw.trailers === "boolean"
    ? raw.trailers
    : DEFAULT_SETTINGS.appearance.trailers;

  // Autoplay
  const autoplay = typeof rawPlayback.autoplay === "boolean"
    ? rawPlayback.autoplay
    : typeof raw.autoplay === "boolean"
    ? raw.autoplay
    : DEFAULT_SETTINGS.playback.autoplay;

  // Auto skip intro
  const autoSkipIntro = typeof rawPlayback.autoSkipIntro === "boolean"
    ? rawPlayback.autoSkipIntro
    : typeof raw.autoSkipIntro === "boolean"
    ? raw.autoSkipIntro
    : DEFAULT_SETTINGS.playback.autoSkipIntro;

  // Seek time
  const seekCandidate = typeof rawPlayback.seekTime === "number"
    ? rawPlayback.seekTime
    : typeof raw.seekTime === "number"
    ? raw.seekTime
    : DEFAULT_SETTINGS.playback.seekTime;
  const seekTime = [5, 10, 15, 30].includes(seekCandidate) ? seekCandidate : DEFAULT_SETTINGS.playback.seekTime;

  // Auto subtitles
  const autoSubtitles = typeof rawPlayback.autoSubtitles === "boolean"
    ? rawPlayback.autoSubtitles
    : typeof raw.autoSubtitles === "boolean"
    ? raw.autoSubtitles
    : DEFAULT_SETTINGS.playback.autoSubtitles;

  // Preferred language
  const langCandidate = (rawPlayback.preferredLanguage ?? raw.defaultSubtitleLanguage ?? raw.preferredLanguage) as string | undefined;
  const preferredLanguage = typeof langCandidate === "string" && langCandidate.trim().length > 0
    ? langCandidate.trim()
    : DEFAULT_SETTINGS.playback.preferredLanguage;

  // Subtitle font
  const fontCandidate = (rawSubtitles.font ?? raw.subtitleFont) as string | undefined;
  const font: SubtitleFont = VALID_FONTS.includes(fontCandidate as SubtitleFont)
    ? (fontCandidate as SubtitleFont)
    : DEFAULT_SETTINGS.subtitles.font;

  // Subtitle text size (50 to 200 percent)
  const sizeCandidate = typeof rawSubtitles.textSize === "number"
    ? rawSubtitles.textSize
    : typeof raw.subtitleSize === "number"
    ? raw.subtitleSize
    : typeof raw.textSize === "number"
    ? raw.textSize
    : DEFAULT_SETTINGS.subtitles.textSize;
  const textSize = typeof sizeCandidate === "number" && sizeCandidate >= 50 && sizeCandidate <= 200
    ? sizeCandidate
    : DEFAULT_SETTINGS.subtitles.textSize;

  // Subtitle color (supports hex string, named color, or preset)
  const colorCandidate = (rawSubtitles.textColor ?? raw.subtitleColor ?? raw.textColor) as string | undefined;
  let textColor = DEFAULT_SETTINGS.subtitles.textColor;
  if (typeof colorCandidate === "string" && colorCandidate.trim().length > 0) {
    const trimmed = colorCandidate.trim();
    if (trimmed === "white") textColor = "#ffffff";
    else if (trimmed === "yellow") textColor = "#e2e535";
    else if (trimmed === "cyan") textColor = "#80b1fa";
    else if (trimmed === "magenta") textColor = "#f472b6";
    else if (trimmed === "green") textColor = "#10b981";
    else if (/^#([0-9a-fA-F]{3,8})$/.test(trimmed)) textColor = trimmed;
    else textColor = trimmed;
  }

  // Background blur
  const blurCandidate = typeof rawSubtitles.backgroundBlur === "boolean"
    ? rawSubtitles.backgroundBlur
    : typeof raw.subtitleBackground === "boolean"
    ? raw.subtitleBackground
    : typeof raw.backgroundBlur === "boolean"
    ? raw.backgroundBlur
    : DEFAULT_SETTINGS.subtitles.backgroundBlur;

  // Subtitle position (0 to 50 percent)
  const posCandidate = typeof rawSubtitles.position === "number"
    ? rawSubtitles.position
    : typeof raw.subtitlePosition === "number"
    ? raw.subtitlePosition
    : typeof raw.position === "number"
    ? raw.position
    : DEFAULT_SETTINGS.subtitles.position;
  const position = typeof posCandidate === "number" && posCandidate >= 0 && posCandidate <= 50
    ? Math.round(posCandidate)
    : DEFAULT_SETTINGS.subtitles.position;

  // Subtitle delay (-20 to +20 seconds)
  const delayCandidate = typeof rawSubtitles.delay === "number"
    ? rawSubtitles.delay
    : typeof raw.subtitleDelay === "number"
    ? raw.subtitleDelay
    : typeof raw.delay === "number"
    ? raw.delay
    : DEFAULT_SETTINGS.subtitles.delay;
  const delay = typeof delayCandidate === "number" && !Number.isNaN(delayCandidate)
    ? Math.max(-20, Math.min(20, Math.round(delayCandidate * 10) / 10))
    : DEFAULT_SETTINGS.subtitles.delay;

  // Use native subtitles
  const nativeCandidate = typeof rawSubtitles.useNative === "boolean"
    ? rawSubtitles.useNative
    : typeof raw.useNativeSubtitles === "boolean"
    ? raw.useNativeSubtitles
    : typeof raw.useNative === "boolean"
    ? raw.useNative
    : DEFAULT_SETTINGS.subtitles.useNative;

  // Pastel mode
  const pastelCandidate = typeof rawSubtitles.pastelMode === "boolean"
    ? rawSubtitles.pastelMode
    : typeof raw.pastelMode === "boolean"
    ? raw.pastelMode
    : DEFAULT_SETTINGS.subtitles.pastelMode;

  // Subtitle auto-sync
  const autoSync = typeof rawSubtitles.autoSync === "boolean"
    ? rawSubtitles.autoSync
    : typeof raw.autoSync === "boolean"
    ? raw.autoSync
    : DEFAULT_SETTINGS.subtitles.autoSync;

  // Hover thumbnails
  const hoverThumbnails = typeof rawPlayback.hoverThumbnails === "boolean"
    ? rawPlayback.hoverThumbnails
    : typeof raw.hoverThumbnails === "boolean"
    ? raw.hoverThumbnails
    : DEFAULT_SETTINGS.playback.hoverThumbnails;

  return {
    appearance: {
      theme,
      episodeViewStyle,
      detailViewType,
      useImageLogos,
      trailers,
    },
    playback: {
      autoplay,
      autoSkipIntro,
      seekTime,
      autoSubtitles,
      preferredLanguage,
      hoverThumbnails,
    },
    subtitles: {
      font,
      textSize,
      textColor,
      backgroundBlur: blurCandidate,
      position,
      delay,
      useNative: nativeCandidate,
      pastelMode: pastelCandidate,
      autoSync,
    },
  };
}
