export type SiteTheme = "default" | "emerald" | "cyan" | "amber" | "rose" | "purple";
export type EpisodeViewStyle = "carousel" | "vertical";
export type DetailViewType = "page" | "modal";

export type SubtitleFont = "cineby" | "netflix" | "montserrat";
export type SubtitleColor = "white" | "yellow" | "cyan" | "magenta";

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
  textSize: number; // 50 to 150 percent
  textColor: SubtitleColor;
  backgroundBlur: boolean;
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
    textColor: "white",
    backgroundBlur: true,
  },
};

const VALID_THEMES: readonly SiteTheme[] = ["default", "emerald", "cyan", "amber", "rose", "purple"];
const VALID_DETAIL_VIEWS: readonly DetailViewType[] = ["page", "modal"];
const VALID_FONTS: readonly SubtitleFont[] = ["cineby", "netflix", "montserrat"];
const VALID_COLORS: readonly SubtitleColor[] = ["white", "yellow", "cyan", "magenta"];

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
    subtitleColor: settings.subtitles.textColor === "white" ? "#ffffff" : settings.subtitles.textColor,
    textColor: settings.subtitles.textColor,
    subtitleBackground: settings.subtitles.backgroundBlur,
    backgroundBlur: settings.subtitles.backgroundBlur,

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

  // Subtitle text size
  const sizeCandidate = typeof rawSubtitles.textSize === "number"
    ? rawSubtitles.textSize
    : typeof raw.subtitleSize === "number"
    ? raw.subtitleSize
    : DEFAULT_SETTINGS.subtitles.textSize;
  const textSize = typeof sizeCandidate === "number" && sizeCandidate >= 50 && sizeCandidate <= 150
    ? sizeCandidate
    : DEFAULT_SETTINGS.subtitles.textSize;

  // Subtitle color
  const colorCandidate = (rawSubtitles.textColor ?? raw.subtitleColor ?? raw.textColor) as string | undefined;
  let textColor: SubtitleColor = DEFAULT_SETTINGS.subtitles.textColor;
  if (colorCandidate === "#ffffff" || colorCandidate === "white") {
    textColor = "white";
  } else if (VALID_COLORS.includes(colorCandidate as SubtitleColor)) {
    textColor = colorCandidate as SubtitleColor;
  }

  // Background blur
  const blurCandidate = typeof rawSubtitles.backgroundBlur === "boolean"
    ? rawSubtitles.backgroundBlur
    : typeof raw.subtitleBackground === "boolean"
    ? raw.subtitleBackground
    : DEFAULT_SETTINGS.subtitles.backgroundBlur;

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
    },
  };
}
