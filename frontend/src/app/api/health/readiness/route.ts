import { NextResponse } from "next/server";

import { getMissingEnvSummary, getRuntimeReadiness } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const readiness = getRuntimeReadiness();
  const missing = getMissingEnvSummary();
  const checks = [
    {
      name: "Supabase public auth",
      status: readiness.supabaseConfigured ? "pass" : "fail",
      detail: readiness.supabaseConfigured
        ? "Public Supabase envs are configured."
        : "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
    },
    {
      name: "Supabase admin",
      status: readiness.supabaseAdminConfigured ? "pass" : "fail",
      detail: readiness.supabaseAdminConfigured
        ? "Server-side admin access is configured."
        : "SUPABASE_SERVICE_ROLE_KEY is missing.",
    },
    {
      name: "Google OAuth",
      status: readiness.googleOauthConfigured ? "pass" : "fail",
      detail: readiness.googleRefreshConfigured
        ? "Google OAuth plus refresh-token recovery are configured."
        : readiness.googleOauthConfigured
          ? "Google OAuth is available, but silent refresh is not configured."
          : "Google OAuth is not configured.",
    },
    {
      name: "Notion workspace broker",
      status: readiness.notionOauthConfigured ? "pass" : "fail",
      detail: readiness.notionOauthConfigured
        ? "Notion local OAuth broker is configured."
        : "Notion OAuth broker envs are incomplete.",
    },
    {
      name: "Razorpay",
      status: readiness.razorpayConfigured ? "pass" : "fail",
      detail: readiness.razorpayConfigured
        ? "Billing credentials are configured."
        : "One or more Razorpay server credentials are missing.",
    },
    {
      name: "Transcript policy",
      status:
        readiness.transcriptStorageMode === "disabled" || readiness.transcriptDownloadsEnabled
          ? "pass"
          : "warn",
      detail:
        readiness.transcriptStorageMode === "disabled"
          ? "Production-safe findings-only launch mode is active."
          : readiness.transcriptDownloadsEnabled
            ? "Temporary transcript downloads are enabled."
            : "Memory transcript mode is configured, but downloads are blocked in this runtime.",
    },
  ];

  return NextResponse.json(
    {
      ok: missing.length === 0,
      timestamp: new Date().toISOString(),
      readiness,
      missing,
      checks,
    },
    {
      status: missing.length === 0 ? 200 : 503,
    }
  );
}
