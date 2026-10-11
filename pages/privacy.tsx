import Head from "next/head";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Cineby</title>
        <meta
          name="description"
          content="Privacy Policy for Cineby detailing user data protection, Google authentication, and media playback information."
        />
      </Head>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28 md:pt-36 text-white/90">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Last updated: October 8, 2026
          </p>
        </div>

        <div className="space-y-8 rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-10 backdrop-blur-md text-sm leading-relaxed text-white/80">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Overview</h2>
            <p>
              Cineby respects your privacy and is committed to protecting the personal data you share with us. This Privacy Policy explains what information we collect, how we use it, and how your data is secured when using our streaming discovery platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Information We Collect</h2>
            <p>We collect only the minimum information necessary to provide and personalize our services:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/70">
              <li>
                <strong className="text-white">Account Information:</strong> When you register via email or username, we store your username, email address, display name, and securely hashed passwords.
              </li>
              <li>
                <strong className="text-white">Google Authentication Data:</strong> When signing in with Google One Tap or Google Sign-In, we receive your verified email address, name, and profile picture URL from Google Identity Services. We use this strictly to authenticate your account and sync your user profiles.
              </li>
              <li>
                <strong className="text-white">User Profiles & Preferences:</strong> Profile names, avatar selections, favorite genres, watchlist entries, and resume playback timestamps.
              </li>
              <li>
                <strong className="text-white">Technical Data:</strong> IP addresses and User-Agent strings stored temporarily for rate limiting and session security.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Google User Data Policy Compliance</h2>
            <p>
              Cineby’s use and transfer to any other app of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p>
              Google credentials and user data are used exclusively to create or link your Cineby account and maintain secure sessions. We never sell, rent, or transfer your Google user data to third-party data brokers or advertising networks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Third-Party Media Sources & APIs</h2>
            <p>
              Cineby is a discovery and playback interface. Metadata and imagery are provided by The Movie Database (TMDB). Video streams are resolved and delivered by independent third-party hosts. Cineby does not host or store media files on its servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Cookies & Local Storage</h2>
            <p>
              We use secure HTTP-only session cookies to authenticate logged-in users and local browser storage to save active profile selections and playback preferences on your device.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Data Deletion & Account Rights</h2>
            <p>
              You have full ownership of your data. You can edit your profile details, clear your watch history and watchlist, or permanently delete your account directly inside{" "}
              <Link href="/settings" className="text-primary underline hover:text-primary/80">
                Settings
              </Link>
              . Deleting your account immediately removes your user records, profiles, history, and active sessions from our database.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Contact Us</h2>
            <p>
              If you have any questions regarding this Privacy Policy or data protection, contact us at{" "}
              <a href="mailto:maheshsharan28@gmail.com" className="text-primary underline hover:text-primary/80">
                maheshsharan28@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
