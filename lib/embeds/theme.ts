import type { SiteTheme } from "@/lib/settings/types";
import type { EmbedThemeConfig } from "./types";

// Hex versions of the --primary tokens in styles/globals.css; embeds only accept hex colours.
// The secondary colour is a very dark tint of the primary, used by embeds for their backgrounds.
const EMBED_THEMES: Record<SiteTheme, Required<EmbedThemeConfig>> = {
  default: { primary: "DC2626", secondary: "170000" },
  emerald: { primary: "10B981", secondary: "001710" },
  cyan: { primary: "06B6D4", secondary: "001417" },
  amber: { primary: "F59E0B", secondary: "170F00" },
  rose: { primary: "F43F5E", secondary: "170007" },
  purple: { primary: "A855F7", secondary: "0F0017" },
};

export function getEmbedTheme(theme: SiteTheme): Required<EmbedThemeConfig> {
  return EMBED_THEMES[theme] ?? EMBED_THEMES.default;
}
