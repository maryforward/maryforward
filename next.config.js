const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    // The research PDF library (~580MB) is served from Vercel Blob at runtime,
    // never bundled. Keep it out of every function's trace so functions stay
    // under Vercel's 300MB limit. See lib/research-storage.ts.
    outputFileTracingExcludes: {
      "*": ["resources/**"],
    },
  },
};

module.exports = withNextIntl(nextConfig);
