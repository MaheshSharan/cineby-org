import { Head, Html, Main, NextScript } from "next/document";

import { PWA_BACKGROUND_COLOR } from "@/lib/constants/pwa";

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <meta name="theme-color" content={PWA_BACKGROUND_COLOR} />
        <meta name="color-scheme" content="dark" />
        <meta name="mobile-web-app-capable" content="yes" />
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