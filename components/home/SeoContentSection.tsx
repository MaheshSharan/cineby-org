import Link from "next/link";

const HEADING_CLASS =
  "text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white mb-4 uppercase break-words [word-break:break-word]";
const BODY_CLASS =
  "space-y-4 text-xs sm:text-sm text-white/70 leading-relaxed font-normal break-words [word-break:break-word]";
const LINK_CLASS = "text-white hover:underline font-medium break-all";

export function SeoContentSection() {
  return (
    <section
      className="mt-14 sm:mt-20 w-full max-w-full overflow-hidden border-t border-white/[0.08] pt-12 sm:pt-16 pb-6 text-white/80"
      aria-labelledby="seo-content-heading"
    >
      <div className="w-full max-w-full overflow-hidden space-y-10 sm:space-y-12 text-left">
        <div className="w-full max-w-full overflow-hidden">
          <h2 id="seo-content-heading" className={HEADING_CLASS}>
            Cineby: Free Movies &amp; TV Shows Online
          </h2>
          <div className={BODY_CLASS}>
            <p>
              <strong className="text-white font-semibold">Cineby</strong> is a free movie and TV streaming site at{" "}
              <Link href="/" className={LINK_CLASS}>cineby.group</Link>. Browse trending, top-rated and upcoming titles, read
              details, cast and trailers, and start watching without creating an account. Cineby works in any modern browser on
              phones, tablets, computers and TVs.
            </p>
          </div>
        </div>

        <div className="w-full max-w-full overflow-hidden">
          <h2 className={HEADING_CLASS}>Official Cineby Website: cineby.group</h2>
          <div className={BODY_CLASS}>
            <p>
              The official Cineby website is <Link href="/" className={LINK_CLASS}>cineby.group</Link>. The earlier Cineby sites
              shut down in August 2026, and Cineby relaunched in November 2026 at cineby.group.
            </p>
            <p>
              Other sites and apps that use the Cineby name, including cineby.gd, cineby.ws and cineby.rocks, are not operated by
              Cineby. Use cineby.group and bookmark it. Read the full story in{" "}
              <Link href="/blog/cineby-is-back-2026-official-streaming-relaunch" className="text-white hover:underline font-medium">
                Cineby Is Back: The 2026 Relaunch
              </Link>{" "}
              or visit the <Link href="/about" className="text-white hover:underline font-medium">About Cineby</Link> page.
            </p>
          </div>
        </div>

        <div className="w-full max-w-full overflow-hidden">
          <h2 className={HEADING_CLASS}>Cineby App and Smart TV</h2>
          <div className={BODY_CLASS}>
            <p>
              Cineby runs as a Progressive Web App, so there is no APK to download. Install it from your browser in a few
              seconds. The <Link href="/app" className="text-white hover:underline font-medium">Cineby App Guide</Link> has the
              steps for Android, iPhone, desktop and TV.
            </p>
            <p>
              On a big screen, open the browser on your Android TV, Google TV, Fire TV, Samsung or LG TV, go to cineby.group, and
              bookmark it or add it to your home screen.
            </p>
          </div>
        </div>

        <div className="w-full max-w-full overflow-hidden">
          <h2 className={HEADING_CLASS}>Profiles, Watchlists and Resume Playback</h2>
          <div className={BODY_CLASS}>
            <p>
              Create a free account to keep a watchlist, set up separate viewing profiles with optional PIN locks, and pick up
              playback where you left off. If a server is slow, switch to another one from the player.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
