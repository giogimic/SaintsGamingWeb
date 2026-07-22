import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  // Exclude scripts directory from build
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].filter(ext => ext),
  webpack: (config) => {
    config.module.rules.push({
      test: /\.tsx?$/,
      exclude: /scripts/,
    });
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'static-cdn.jtvnw.net' }, // Twitch
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
