import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // An opaque random id per build. It is also written to public/v.txt, which the browser compares with the id
  // inside the page it holds, so a page cached before a deploy can tell it is stale.
  generateBuildId: async () => {
    const buildId = randomBytes(6).toString("hex");
    const publicDir = path.join(process.cwd(), "public");
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(path.join(publicDir, "v.txt"), buildId);
    return buildId;
  },
  output: "standalone",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wsrv.nl",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "assets.cineby.group",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // NEXT_PUBLIC_* values are inlined by Next.js at build time. No `env` mapping is needed here.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/browse/movies",
        destination: "/browse/movie",
        permanent: true,
      },
      {
        source: "/browse/shows",
        destination: "/browse/tv",
        permanent: true,
      },
      {
        source: "/browse/series",
        destination: "/browse/tv",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;