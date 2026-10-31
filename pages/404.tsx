import Head from "next/head";
import Image from "next/image";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found · Cineby</title>
        <meta name="robots" content="noindex, follow" />
      </Head>

      <section
        aria-label="Page Not Found"
        className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#070505]"
      >
        {/* Ambient Blurred Backdrop for Mobile/Portrait Fill */}
        <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/assets/pages/error_code/404.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-125 object-cover object-center blur-2xl opacity-40 brightness-75"
          />
        </div>

        {/* Main Artwork:
            - Mobile: object-contain with top-safe offset so full landscape (girl + 404 text) shows completely without cropping.
            - Desktop: object-cover shifted down with translate-y and object-[center_28%] so top-right "404 / This scene is missing" clears the header cluster.
        */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center pt-16 pb-16 md:py-0">
          <div className="relative h-full w-full md:translate-y-6 lg:translate-y-8">
            <Image
              src="/assets/pages/error_code/404.webp"
              alt="404 - Page Not Found"
              fill
              priority
              sizes="100vw"
              className="object-contain md:object-cover md:object-[center_28%]"
            />
          </div>
        </div>

        {/* Top Header Shadow Gradient - blends with fixed header cluster */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-28 md:h-36 bg-gradient-to-b from-[#070505]/95 via-[#070505]/50 to-transparent"
        />

        {/* Bottom Ambient Fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-[#070505]/90 to-transparent"
        />
      </section>
    </>
  );
}
