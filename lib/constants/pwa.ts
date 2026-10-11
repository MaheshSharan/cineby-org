// Must equal the --background token in styles/globals.css (hsl 0 0% 2%) so the launch splash has no flash.
// public/manifest.webmanifest and public/offline.html repeat it; tests/pwa.test.ts keeps all three in sync.
export const PWA_BACKGROUND_COLOR = "#050505";
