const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    // Next 14.2 keeps these under `experimental`. (serverComponentsExternalPackages
    // was renamed to the top-level serverExternalPackages in Next 15.) Externalizing
    // pdf-parse stops it being bundled — bundling triggers its debug code path that
    // reads a missing test PDF and crashes in serverless.
    serverComponentsExternalPackages: ["pdf-parse"],
    // The research PDF library (~580MB) is served from Vercel Blob at runtime,
    // never bundled. Keep it out of every function's trace so functions stay
    // under Vercel's 300MB limit. See lib/research-storage.ts.
    outputFileTracingExcludes: {
      "*": ["resources/**"],
    },
  },
};

module.exports = withNextIntl(nextConfig);
