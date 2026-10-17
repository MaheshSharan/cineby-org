/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
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