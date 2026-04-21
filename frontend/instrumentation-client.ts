import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_RELEASE_VERSION,
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0"),
    replaysSessionSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? "0"
    ),
    replaysOnErrorSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? "0"
    ),
    integrations: [Sentry.replayIntegration()],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
