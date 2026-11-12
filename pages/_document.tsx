import { Head, Html, Main, NextScript } from "next/document";

import {
  getImageMode,
  getImageProxyUrl,
  getGoogleSiteVerification,
  getTmdbImageBaseUrl,
} from "@/lib/env/public";
import { IconSprite } from "@/components/ui/icons";
import { PWA_BACKGROUND_COLOR } from "@/lib/constants/pwa";
import { getIosSplashImagePath, getIosSplashMedia, IOS_SPLASH_SCREENS } from "@/lib/pwa/iosSplash";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap";

// The stylesheet is attached by script because a <link rel="stylesheet"> in the head blocks the first paint
// until a third-party server answers. Font files are fetched only for the glyphs the page actually draws.
// The string is a fixed constant, so nothing user-controlled reaches the inline script.
const FONT_STYLESHEET_LOADER = `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(
  GOOGLE_FONTS_URL
)};document.head.appendChild(l);})();`;

function getImageOrigin(): string {
  const base = getImageMode() === "tmdb" ? getTmdbImageBaseUrl() : getImageProxyUrl();
  return new URL(base).origin;
}

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={getImageOrigin()} crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: FONT_STYLESHEET_LOADER }} />
        <noscript>
          <link href={GOOGLE_FONTS_URL} rel="stylesheet" />
        </noscript>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <meta name="theme-color" content={PWA_BACKGROUND_COLOR} />
        <meta name="color-scheme" content="dark" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Cineby" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        {IOS_SPLASH_SCREENS.map((screen) => (
          <link
            key={getIosSplashImagePath(screen) + screen.pixelRatio}
            rel="apple-touch-startup-image"
            href={getIosSplashImagePath(screen)}
            media={getIosSplashMedia(screen)}
          />
        ))}
        {getGoogleSiteVerification() && (
          <meta name="google-site-verification" content={getGoogleSiteVerification()} />
        )}
        <meta name="yandex-verification" content="fccb92f9db4468c5" />
        <script
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prefetch: [
                {
                  where: {
                    and: [
                      { href_matches: "/*" },
                      { not: { href_matches: ["/watch*", "/api*", "/admin*"] } }
                    ]
                  },
                  eagerness: "conservative"
                }
              ]
            })
          }}
        />
      </Head>
      <body className="bg-background">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('cineby_settings');
                  if (raw) {
                    var parsed = JSON.parse(raw);
                    if (parsed && parsed.appearance && parsed.appearance.theme) {
                      document.documentElement.setAttribute('data-theme', parsed.appearance.theme);
                    }
                  }
                } catch(e) {}
                try {
                  var cw = JSON.parse(localStorage.getItem('cineby_continue_state') || 'null');
                  if (cw && cw.hasItems === true) {
                    document.documentElement.setAttribute('data-has-continue', '');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <IconSprite />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}