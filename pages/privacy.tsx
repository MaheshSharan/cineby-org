import Link from "next/link";

import { PageSeo } from "@/components/seo/PageSeo";

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageSeo
        title="Privacy Policy - Cineby"
        description="Privacy Policy for Cineby (Google Project MAARE) detailing user data protection, Google OAuth compliance, and data retention standards."
        path="/privacy"
      />

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28 md:pt-36 text-white/90">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Effective Date: October 17, 2026 | Application: Cineby (Google Project MAARE) | Website: https://cineby.group
          </p>
        </div>

        <div className="space-y-8 rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-10 backdrop-blur-md text-sm leading-relaxed text-white/80">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Introduction & Application Purpose</h2>
            <p>
              Cineby (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operated under the Google Cloud Project <strong>MAARE</strong>, is an interactive media indexing, discovery, and personal watch tracking web application accessible at <a href="https://cineby.group" className="text-primary underline">https://cineby.group</a> and <a href="https://www.cineby.group" className="text-primary underline">https://www.cineby.group</a>.
            </p>
            <p>
              This Privacy Policy explains in detail our practices regarding the collection, use, disclosure, storage, and protection of personal data when you interact with our website, create a profile, or authenticate using Google Identity Services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Scope of Data We Collect</h2>
            <p>We only collect the minimal personal information essential to deliver personal profile management, watchlist synchronization, and playback progress tracking:</p>
            <ul className="list-disc pl-5 space-y-2 text-white/70">
              <li>
                <strong className="text-white">Google OAuth & Identity Data:</strong> When you choose to authenticate via Google One Tap or Google Sign-In, we request access exclusively to non-sensitive scopes: your public name, primary email address, and profile picture avatar. We do not request access to contacts, files, Gmail, Google Drive, or calendar data.
              </li>
              <li>
                <strong className="text-white">Local Authentication Data:</strong> For standard accounts, we collect a chosen username, email address, and a salted cryptographic hash (via bcrypt) of your password. We never store plaintext passwords.
              </li>
              <li>
                <strong className="text-white">Watch Activity & Profile Preferences:</strong> Active profile names, custom PIN codes (encrypted), watch progress timestamps (used to resume media playback where you left off), and titles added to your personal watchlist.
              </li>
              <li>
                <strong className="text-white">Technical Diagnostic Data:</strong> IP addresses, browser user-agent header information, and transient connection tokens collected strictly for security defense, DDoS mitigation, and rate limiting.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. How We Use Your Information</h2>
            <p>Your information is used strictly for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/70">
              <li>To authenticate your identity and grant access to your account.</li>
              <li>To synchronize your personal profiles, watchlist items, and playback resume points across devices.</li>
              <li>To maintain session state and remember user appearance, caption, and audio player settings.</li>
              <li>To safeguard against unauthorized access, abusive traffic, or malicious requests.</li>
            </ul>
            <p className="mt-2 text-white/90">
              We do <strong>not</strong> sell, rent, trade, or monetize your personal information or Google user data. We do not use your information to serve personalized advertisements or build ad profiles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Compliance with Google API Services User Data Policy</h2>
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
              , including the Limited Use requirements. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/70">
              <li>We only utilize Google user data to provide user-facing features (account creation and identity verification).</li>
              <li>We do not transfer Google user data to third parties unless necessary to provide or improve these features, comply with applicable laws, or as part of a merger/acquisition.</li>
              <li>We never use or transfer Google user data for serving advertisements, retargeting, or data brokerage.</li>
              <li>No humans read your Google user data unless you give explicit permission for technical support, it is required for security investigations, or to comply with law.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Data Retention, Account Deletion & User Rights</h2>
            <p>
              You maintain total control over your personal data. We retain personal data only as long as your account remains active.
            </p>
            <p>
              <strong>Self-Service Account & Data Deletion:</strong> You can permanently delete your entire account, all associated user profiles, watch history, and watchlist entries at any time by navigating to{" "}
              <Link href="/settings" className="text-primary underline hover:text-primary/80">
                Account Settings
              </Link>{" "}
              and clicking &quot;Delete Account&quot;. This action executes an irreversible cascade deletion across all our database tables immediately.
            </p>
            <p>
              You may also revoke Cineby&apos;s access to your Google Account at any time through your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Google Security Settings
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Third-Party Integrations & Metadata</h2>
            <p>
              Cineby acts as an informational interface and media discovery organizer. Media posters, descriptions, and episode information are retrieved dynamically via The Movie Database (TMDB) API. Cineby does not host or transmit unauthorized copyrighted media on its servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Security Measures</h2>
            <p>
              All traffic between your browser and Cineby is encrypted in transit using industry-standard TLS 1.3 / HTTPS. Session tokens are signed using cryptographic signatures and stored in HttpOnly, SameSite cookies to protect against cross-site scripting (XSS) and CSRF attacks.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">8. Contact Information & Data Protection Officer</h2>
            <p>
              For any questions, data requests, or privacy inquiries regarding Cineby or our Google Cloud Project MAARE, please contact us directly:
            </p>
            <div className="mt-2 rounded-xl bg-white/5 p-4 border border-white/10 space-y-1">
              <p><strong className="text-white">Developer / Project Lead:</strong> Mahesh Sharan</p>
              <p><strong className="text-white">Email:</strong> <a href="mailto:maheshsharan28@gmail.com" className="text-primary underline">maheshsharan28@gmail.com</a></p>
              <p><strong className="text-white">Application URL:</strong> <a href="https://cineby.group" className="text-primary underline">https://cineby.group</a></p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
