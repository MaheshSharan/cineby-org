import Link from "next/link";

import { getContactEmail, getSiteUrl } from "@/lib/env/public";
import { getSiteHost, SOCIAL_PROFILE_URLS } from "@/lib/seo/site";

export function AboutContent() {
  const siteUrl = getSiteUrl();
  const contactEmail = getContactEmail();

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-28 md:pt-36 text-white/90">
      <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">About Cineby</h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-white/80">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">What Cineby is</h2>
          <p>
            Cineby is a free movie and TV streaming site. You can browse trending, top-rated and upcoming titles, read details,
            cast and trailers, keep a watchlist, and start watching without creating an account. Title information comes from
            TMDB.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">The official Cineby website</h2>
          <p>
            The official Cineby website is <a href={siteUrl} className="text-white underline">{getSiteHost()}</a>.
            The earlier Cineby sites shut down in August 2026, and Cineby relaunched in November 2026 at this address. Read the
            full story in{" "}
            <Link href="/blog/cineby-is-back-2026-official-streaming-relaunch" className="text-white underline">
              Cineby Is Back: The 2026 Relaunch
            </Link>
            .
          </p>
          <p>
            Other sites and apps that use the Cineby name, including cineby.gd, cineby.ws and cineby.rocks, are not operated by
            Cineby.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Contact and official channels</h2>
          <p>
            Email <a href={`mailto:${contactEmail}`} className="text-white underline">{contactEmail}</a>.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {SOCIAL_PROFILE_URLS.map((url) => (
              <li key={url}>
                <a href={url} rel="me noopener" className="text-white underline break-all">{url}</a>
              </li>
            ))}
          </ul>
          <p>
            See also the <Link href="/privacy" className="text-white underline">Privacy Policy</Link> and{" "}
            <Link href="/terms" className="text-white underline">Terms of Service</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
