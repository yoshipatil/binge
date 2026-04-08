import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
]

// Allowed origins for API calls.
// Web: same-origin only (empty CORS list = browser enforces same-origin).
// Future native apps: add "capacitor://localhost", "ionic://localhost", or
// "https://binge.app" here when building iOS/Android clients.
// These origins are validated per-request via the CORS headers below.
const ALLOWED_API_ORIGINS = [
  process.env.NEXTAUTH_URL ?? "http://localhost:3000",
].filter(Boolean)

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Security headers on all routes
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // CORS headers on API routes — locked to allowed origins.
      // Credentials (cookies/auth tokens) are allowed so Auth.js sessions work.
      // Future native apps get a separate ALLOWED_API_ORIGINS entry.
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: ALLOWED_API_ORIGINS[0] ?? "",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,DELETE,PATCH,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
    ]
  },
  images: {
    // Skip Vercel Image Optimization — TMDB CDN already serves properly sized
    // images (w154/w185/w342) and Google avatars are small WebP. Re-optimizing
    // them burns through the free tier quota (5,000 transformations/month).
    // Remove this when upgrading to Vercel Pro.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: "binge",
  project: "binge-app",
  silent: true,
  widenClientFileUpload: true,
  disableLogger: true,
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (i.e. in CI/Vercel)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
