import { Head, Html, Main, NextScript } from "next/document";

import { getImageMode, getImageProxyUrl, getTmdbImageBaseUrl } from "@/lib/env/public";
import { PWA_BACKGROUND_COLOR } from "@/lib/constants/pwa";
import { getIosSplashImagePath, getIosSplashMedia, IOS_SPLASH_SCREENS } from "@/lib/pwa/iosSplash";

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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.cdnfonts.com/css/netflix-font" rel="stylesheet" />
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
        <meta name="google-adsense-account" content="ca-pub-8925754855638542" />
        <meta name="6a97888e-site-verification" content="a09985be3717c4b44c4f8b2f6614be2c" />
        <meta
          httpEquiv="Delegate-CH"
          content="Sec-CH-UA https://s.magsrv.com; Sec-CH-UA-Mobile https://s.magsrv.com; Sec-CH-UA-Arch https://s.magsrv.com; Sec-CH-UA-Model https://s.magsrv.com; Sec-CH-UA-Platform https://s.magsrv.com; Sec-CH-UA-Platform-Version https://s.magsrv.com; Sec-CH-UA-Bitness https://s.magsrv.com; Sec-CH-UA-Full-Version-List https://s.magsrv.com; Sec-CH-UA-Full-Version https://s.magsrv.com;"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8925754855638542"
          crossOrigin="anonymous"
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
              })();
            `,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}