import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release:
      process.env.SENTRY_RELEASE ??
      process.env.NEXT_PUBLIC_RELEASE_VERSION ??
      process.env.VERCEL_GIT_COMMIT_SHA ??
      undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0"),
  });
}
