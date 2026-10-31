import Link from "next/link";

export function SeoContentSection() {
  return (
    <section
      className="mt-14 sm:mt-20 w-full border-t border-white/[0.08] pt-12 sm:pt-16 pb-6 text-white/80"
      aria-labelledby="seo-content-heading"
    >
      <div className="w-full space-y-10 sm:space-y-12 text-left">
        {/* Section 1: Cineby Brand & Overview */}
        <div>
          <h2
            id="seo-content-heading"
            className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white mb-4 uppercase"
          >
            Cineby: Free Movies &amp; TV Shows Online in HD
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
            <p>
              <strong className="text-white font-semibold">Cineby</strong> is a premier free online streaming platform that lets you{" "}
              <strong className="text-white font-semibold">watch free movies online</strong> and explore top-rated TV shows directly in your browser with zero friction. Built for film lovers seeking an uncluttered cinema experience, the official{" "}
              <strong className="text-white font-semibold">Cineby URL</strong> (<Link href="/" className="text-white hover:underline font-medium">cineby.group</Link>) brings together thousands of hours of high-definition entertainment spanning over 30 genres—from box-office blockbuster action and psychological thrillers to binge-worthy drama series, anime, and indie releases.
            </p>
            <p>
              Unlike subscription-gated platforms or clunky third-party apps, Cineby operates without mandatory registration, email verification, or credit cards. Whether you discovered us through recommendations on{" "}
              <strong className="text-white font-semibold">Cineby watch free movies online Reddit</strong> communities, domain ranking reports on{" "}
              <strong className="text-white font-semibold">Cineby Similarweb</strong>, or curated streaming indexes, our mission remains transparent: deliver fast, seamless playback with crystal-clear 1080p video and spatial audio clarity on any connection.
            </p>
          </div>
        </div>

        {/* Section 2: Device & App Flexibility */}
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white mb-4 uppercase">
            Cineby App, Mobile &amp; Smart TV Compatibility
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
            <p>
              Viewers frequently ask how to access the{" "}
              <strong className="text-white font-semibold">Cineby watch free movies online app</strong>. Cineby is built as an edge-optimized Progressive Web App (PWA), meaning you do not need to download risky APKs or clutter your device with third-party software. Simply open your preferred browser—Chrome, Safari, Firefox, or Edge—and install Cineby directly to your home screen with one tap.
            </p>
            <p>
              Enjoying movies on the big screen is effortless with{" "}
              <strong className="text-white font-semibold">Cineby at TV</strong>. Our responsive layout natively adapts to Apple TV, Android TV, Google TV, Samsung Tizen, LG webOS, and Firestick browsers. With full cast-ready and widescreen viewport support, you can turn your living room into an authentic home theater with zero lag and instant server responsiveness.
            </p>
          </div>
        </div>

        {/* Section 3: High Definition, Live Events & Cineby Plus */}
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white mb-4 uppercase">
            Cineby HD, Global Events &amp; Cineby Plus Features
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-white/70 leading-relaxed font-normal">
            <p>
              With{" "}
              <strong className="text-white font-semibold">Cineby HD</strong>, you get adaptive bitrate playback that automatically calibrates to your network bandwidth, ensuring smooth 1080p resolution without buffering interruptions. For major global cultural broadcasts and international sports celebrations like the{" "}
              <strong className="text-white font-semibold">Cineby World Cup</strong> coverage, our multi-mirror architecture provides reliable, load-balanced stream mirrors so viewers can stay connected without server timeouts.
            </p>
            <p>
              Through our personalized{" "}
              <strong className="text-white font-semibold">Cineby Plus</strong> multi-profile ecosystem, viewers can create custom watchlist collections, track their episode completion progress, resume playback from the exact second they left off, and customize personal PIN locks. Everything is synchronized across devices with privacy-first encryption, giving you a full-featured streaming dashboard completely free.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
