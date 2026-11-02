import { useState } from "react";
import Link from "next/link";

import { PageSeo } from "@/components/seo/PageSeo";
import { sanitizeJsonLd } from "@/lib/seo/jsonLd";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function AppPage() {
  const { canPromptInstall, isStandalone, promptInstall } = useInstallPrompt();
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop" | "tv">("android");

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cineby",
    operatingSystem: "Android, iOS, Windows, macOS, Android TV, Fire TV, WebOS",
    applicationCategory: "EntertainmentApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "14850",
    },
    description:
      "Install the official Cineby App (PWA) to watch free movies and TV shows online in HD. Safe alternative to shady APK downloads with zero storage footprint, instant playback, and Smart TV support.",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is there an official Cineby APK download for Android?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Cineby does not require an APK file. Cineby runs as an official Progressive Web App (PWA) that installs directly through Chrome or your browser. It provides full-screen native performance, automatic updates, and zero malware risk.",
        },
      },
      {
        "@type": "Question",
        name: "How do I install Cineby on iPhone or iPad?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Open Safari on your iOS device, visit cineby.group, tap the Share button (square with arrow), and choose 'Add to Home Screen'. Cineby will launch as a standalone app with full-screen playback.",
        },
      },
      {
        "@type": "Question",
        name: "Can I watch Cineby on Smart TV or Amazon Firestick?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Open the built-in browser (Silk Browser on Firestick, Chrome on Android TV, or standard TV browser on Samsung/LG), navigate to cineby.group, and bookmark or add to home screen for big-screen streaming.",
        },
      },
      {
        "@type": "Question",
        name: "Is Cineby App free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Cineby is 100% free with no subscription, no credit card, and no registration required.",
        },
      },
    ],
  };

  const combinedJsonLd = sanitizeJsonLd([appSchema, faqSchema]);

  return (
    <>
      <PageSeo
        title="Cineby App & APK Download — Install Free Movies & TV App (Android, iOS, TV)"
        description="Download and install the official Cineby App. No risky APK needed — install our high-speed Progressive Web App (PWA) on Android, iPhone, Windows, Mac, and Smart TV."
        path="/app"
        jsonLd={combinedJsonLd}
      />

      <main className="min-h-screen bg-background text-white px-4 py-12 sm:py-20 md:px-8">
        <div className="mx-auto max-w-4xl space-y-12">
          {/* Hero Section */}
          <section className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.08] text-white/90 border border-white/15 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Official Progressive Web App (PWA)
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight uppercase">
              Cineby App <span className="text-primary">&amp; APK</span>
            </h1>

            <p className="mx-auto max-w-2xl text-sm sm:text-base text-white/70 leading-relaxed font-normal">
              Stream movies and TV shows anywhere. No sketchy APK files, no third-party store risks.
              Install Cineby directly onto your home screen with a single tap.
            </p>

            {/* Direct Install CTA */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              {canPromptInstall && !isStandalone ? (
                <button
                  type="button"
                  onClick={promptInstall}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Install Cineby App Now
                </button>
              ) : isStandalone ? (
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-semibold border border-white/20">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Cineby is Already Installed on this Device
                </div>
              ) : (
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm bg-primary text-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Launch Web App &amp; Stream Free
                </Link>
              )}

              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm bg-white/[0.08] text-white hover:bg-white/[0.14] border border-white/15 transition-all"
              >
                Browse Catalog
              </Link>
            </div>
          </section>

          {/* Benefits Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="font-bold text-sm uppercase tracking-wide">100% Virus &amp; Malware Free</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Unlike third-party APK downloads with intrusive permissions, Cineby PWA runs safely in your browser sandbox.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-bold text-sm uppercase tracking-wide">Zero Storage Overhead</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Takes less than 2 MB on your device. Instant loading powered by Cloudflare edge caching.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5">
              <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="font-bold text-sm uppercase tracking-wide">Smart TV &amp; Remote Ready</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Full-screen streaming for Android TV, Firestick, Apple TV, LG webOS, and Samsung Tizen.
              </p>
            </div>
          </section>

          {/* Step-by-Step Installation Tabs */}
          <section className="space-y-6 pt-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                How to Install Cineby
              </h2>
              <p className="text-xs sm:text-sm text-white/60">
                Choose your device platform below for 10-second installation instructions:
              </p>
            </div>

            {/* Platform Selector */}
            <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "android"
                    ? "bg-white/20 text-white shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Android
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "ios"
                    ? "bg-white/20 text-white shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                iPhone/iPad
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("desktop")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "desktop"
                    ? "bg-white/20 text-white shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                PC / Mac
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tv")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "tv"
                    ? "bg-white/20 text-white shadow"
                    : "text-white/60 hover:text-white"
                }`}
              >
                TV / Firestick
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-4">
              {activeTab === "android" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-emerald-400">
                    Android (Chrome / Edge / Brave / Firefox)
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-white/80 leading-relaxed">
                    <li>Open <strong>Chrome</strong> or your preferred Android browser and go to <strong>cineby.group</strong>.</li>
                    <li>Tap the <strong>three dots menu (⋮)</strong> in the top right corner.</li>
                    <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                    <li>Confirm the prompt. Cineby will appear in your app drawer like a native Android APK with an app icon.</li>
                  </ol>
                </div>
              )}

              {activeTab === "ios" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white">
                    iPhone &amp; iPad (Safari)
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-white/80 leading-relaxed">
                    <li>Open <strong>Safari</strong> and navigate to <strong>cineby.group</strong>.</li>
                    <li>Tap the <strong>Share</strong> button (the square with an arrow pointing upward) at the bottom toolbar.</li>
                    <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right. Cineby will install directly to your iOS home screen with no App Store needed.</li>
                  </ol>
                </div>
              )}

              {activeTab === "desktop" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-sky-400">
                    Windows PC &amp; Apple Mac (Chrome / Edge)
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-white/80 leading-relaxed">
                    <li>Open <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on your computer.</li>
                    <li>Visit <strong>cineby.group</strong>.</li>
                    <li>Look at the right side of the URL address bar and click the <strong>Install icon (computer with down arrow)</strong>.</li>
                    <li>Click <strong>Install</strong>. Cineby will open as an independent window with its own taskbar shortcut.</li>
                  </ol>
                </div>
              )}

              {activeTab === "tv" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-amber-400">
                    Smart TV, Amazon Firestick &amp; Android TV
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-white/80 leading-relaxed">
                    <li>Launch your TV&apos;s web browser (e.g. <strong>Amazon Silk Browser</strong> on Fire TV, or <strong>Chrome / Puffin</strong> on Android TV).</li>
                    <li>Type <strong>cineby.group</strong> into the address bar.</li>
                    <li>Add the page to your browser <strong>Bookmarks / Favorites</strong> or home screen shortcuts for one-click access.</li>
                    <li>Use your remote or TV air-mouse to navigate full HD streaming in full screen.</li>
                  </ol>
                </div>
              )}
            </div>
          </section>

          {/* FAQ Section */}
          <section className="space-y-6 pt-6">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-3">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <h3 className="text-sm font-semibold text-white">Why choose Cineby PWA over downloading a third-party APK?</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Third-party streaming APKs found on sketchy download sites often inject adware, crypto-miners, and background trackers into your Android device. Cineby PWA gives you the same app look, feel, and offline caching directly from the secure web standard with zero device permissions.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <h3 className="text-sm font-semibold text-white">Do I need to update the Cineby App manually?</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  No. Cineby automatically updates itself in the background every time new features, movie titles, or server mirrors are released. You will never see an &quot;Update APK&quot; notification.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                <h3 className="text-sm font-semibold text-white">Is Cineby free to watch movies and series?</h3>
                <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
                  Yes, Cineby is completely free with no subscriptions, trials, or hidden fees.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
