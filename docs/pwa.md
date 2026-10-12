# Installable app (PWA)

Cineby installs as a standalone app from Chrome (Android and desktop) and from Safari's Add to Home Screen.

## Files

| File | Role |
| --- | --- |
| `public/manifest.webmanifest` | Name, colors, icons, `standalone` display. Linked from `pages/_document.tsx`. |
| `public/sw.js` | Network-only worker. Makes the app installable and shows `offline.html` when a page navigation fails. |
| `public/offline.html` | Self-contained fallback page (no external assets, so it renders offline). |
| `public/icons/` | `logo.svg` is the source. The PNGs are renders of it. |
| `hooks/useServiceWorker.ts` | Registers the worker in production builds only. |
| `lib/constants/pwa.ts` | `PWA_BACKGROUND_COLOR`, used by the `theme-color` meta tag. |
| `tests/pwa.test.ts` | Guards the manifest, icons, colors and worker behavior. |

## Mobile app feel

- **Install banner** (`components/pwa/InstallBanner.tsx`, `hooks/useInstallPrompt.ts`): shown on touch devices after `INSTALL_BANNER_DELAY_MS`, never in standalone mode or on player/auth routes, and hidden for `INSTALL_DISMISS_DAYS` after a dismissal. Chrome gets the native dialog through `beforeinstallprompt`; iOS gets an "Add to Home Screen" hint because Safari has no install API.
- **Update toast** (`components/pwa/UpdateToast.tsx`): `useServiceWorker` reports when a new worker takes control of an already-controlled page, and re-checks for updates when the app is resumed.
- **iOS launch images**: `lib/pwa/iosSplash.ts` lists the devices; `public/icons/splash/` holds one flat `#050505` PNG with the logo centered (about 28% of the short side) per entry. Add a device by adding both.
- **Shortcuts**: the manifest's Search shortcut opens `/?search=1`, which `Header` consumes to open the search modal.
- **Safe areas**: `viewport-fit=cover` is set in `_app.tsx`; the header, dock and `.layout-container` pad with `env(safe-area-inset-*)`.
- **Screenshots**: `public/screenshots/` holds one narrow and one wide capture for Chrome's richer install dialog. Chrome rejects images whose long side is more than 2.3x the short side; `tests/pwa.test.ts` checks this. Replace them when the home page design changes.

## Rules

- **The worker must stay network-only.** It handles page navigations only. Never cache or intercept `/api/*`, auth, HLS segments or the stream proxy: stale responses, range requests and auth state break playback.
- **Do not set `orientation` in the manifest.** The player needs landscape.
- **The background color has three copies** (`lib/constants/pwa.ts`, the manifest, `offline.html`) because static files cannot import it. All must equal `--background` in `styles/globals.css`, otherwise the launch splash flashes a different color. `tests/pwa.test.ts` fails if they drift.
- **Bump `CACHE_NAME` in `sw.js`** if `offline.html` changes, so installed clients refetch it.

## Regenerating icons

Edit `public/icons/logo.svg`, then render it with any SVG renderer (Chromium, `rsvg-convert`, Inkscape):

- `icon-192.png`, `icon-512.png`: the logo at full size, transparent corners.
- `icon-maskable-512.png`: the logo at 64% of the canvas, centered on `PWA_BACKGROUND_COLOR`, opaque. Android crops maskable icons to a circle, so the logo must stay inside the safe zone.
- `apple-touch-icon.png`: same artwork as the maskable icon at 180×180, saved as RGB with no alpha (iOS fills transparency with black).

## Testing an install

1. Uninstall the old home screen shortcut and clear site data for the domain.
2. Open the production site in Chrome, then use **Install app** from the menu.
3. In DevTools, **Application > Manifest** should show no errors, and **Application > Service Workers** should show `sw.js` as activated.

The worker is not registered in `next dev`. Test with a production build or the deployed site.
