/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
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
      {
        source: "/sitemaps/shows.xml",
        destination: "/sitemaps/tv.xml",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/sitemap.xml",
        destination: "/api/sitemaps/index.xml",
      },
      {
        source: "/sitemaps/pages.xml",
        destination: "/api/sitemaps/pages.xml",
      },
      {
        source: "/sitemaps/movies.xml",
        destination: "/api/sitemaps/movies.xml",
      },
      {
        source: "/sitemaps/tv.xml",
        destination: "/api/sitemaps/tv.xml",
      },
    ];
  },
};

export default nextConfig;