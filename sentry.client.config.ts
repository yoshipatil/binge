import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of transactions for performance monitoring (free tier friendly)
  tracesSampleRate: 0.1,

  // Capture replays only on errors (1% of sessions, 100% of error sessions)
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === "production",

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})
