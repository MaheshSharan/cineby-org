import { PageSeo } from "@/components/seo/PageSeo";

export default function TermsOfServicePage() {
  return (
    <>
      <PageSeo
        title="Terms of Service & Platform Guidelines | Cineby"
        description="Terms of Service for Cineby governing platform usage, account responsibilities, and third-party media content."
        path="/terms"
      />

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-28 md:pt-36 text-white/90">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Last updated: October 8, 2026
          </p>
        </div>

        <div className="space-y-8 rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-10 backdrop-blur-md text-sm leading-relaxed text-white/80">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Cineby, you agree to comply with and be bound by these Terms of Service. If you do not agree with any part of these terms, you should discontinue using the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Service Description & Content Disclaimer</h2>
            <p>
              Cineby provides a modern user interface for exploring entertainment metadata, tracking watch lists, and linking to third-party streaming sources.
            </p>
            <p>
              Cineby does not host, upload, archive, or control any video streams or audio files. All video content is hosted and distributed by independent third-party services. Media information, posters, and summaries are sourced from TMDB under their terms of use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. User Accounts & Security</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials (including passwords and profile PINs). You agree to notify us immediately of any unauthorized access to your account.
            </p>
            <p>
              When authenticating via Google Sign-In or Google One Tap, you authorize Cineby to verify your Google identity and link your verified email address to your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. Acceptable Use Policy</h2>
            <p>You agree to use Cineby for personal, non-commercial purposes and agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/70">
              <li>Attempt to bypass rate limiting, authentication safeguards, or profile security.</li>
              <li>Engage in automated scraping, denial-of-service attacks, or malicious disruptions of platform infrastructure.</li>
              <li>Use the service in violation of applicable local or international laws.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Termination & Modifications</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms or abuse system resources. We may update these terms periodically; continued use of Cineby constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Contact Information</h2>
            <p>
              For legal inquiries, copyright notices, or questions regarding our terms, please contact us at{" "}
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
