/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID:
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "710500048793-55rctnc4coj15s1jvao7l2ouejvpftpn.apps.googleusercontent.com",
  },
};

export default nextConfig;