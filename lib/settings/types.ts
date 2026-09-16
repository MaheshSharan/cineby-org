export type SiteTheme = "default" | "emerald" | "cyan" | "amber" | "rose" | "purple";
export type EpisodeViewStyle = "carousel" | "grid";
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
    episodeViewStyle: "carousel",
    detailViewType: "page",
    useImageLogos: true,
    trailers: true,
  },
  playback: {
    autoplay: true,
    autoSkipIntro: false,
    seekTime: 10,
    autoSubtitles: false,
    preferredLanguage: "en",
  },
  subtitles: {
    font: "cineby",
    textSize: 100,
    textColor: "white",
    backgroundBlur: true,
  },
};
