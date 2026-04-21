import path from "node:path";

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_API_URL?.replace(/\/$/, "") ?? "";
const sentryDsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim() || "";
const connectSrc = ["'self'"];
const isDevelopment = process.env.NODE_ENV === "development";

if (appOrigin) {
  connectSrc.push(appOrigin);
}

if (backendOrigin) {
  connectSrc.push(backendOrigin);
}

if (supabaseUrl) {
  connectSrc.push(supabaseUrl);
}

if (sentryDsn) {
  try {
    connectSrc.push(new URL(sentryDsn).origin);
  } catch {
    // Ignore malformed DSNs in local or unset environments.
  }
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      `script-src 'self' 'unsafe-inline' ${isDevelopment ? "'unsafe-eval' " : ""}https:`,
      `connect-src ${Array.from(new Set(connectSrc)).join(" ")}`,
      "media-src 'self' blob: https:",
    ].join("; "),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development" || !supabaseUrl) {
      return [];
    }

    return [
      {
        source: "/__supabase/:path*",
        destination: `${supabaseUrl}/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  tunnelRoute: "/monitoring",
  silent: true,
});
