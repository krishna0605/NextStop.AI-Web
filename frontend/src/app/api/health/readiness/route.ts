import { NextResponse } from "next/server";

import {
  getMissingEnvSummary,
  getRuntimeReadiness,
  loadAiCoreHealthSnapshot,
} from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const readiness = getRuntimeReadiness();
  const missing = getMissingEnvSummary();
  const aiCoreHealth =
    readiness.aiPipelineMode === "railway_remote" && readiness.aiCoreConfigured
      ? await loadAiCoreHealthSnapshot()
      : null;
  const cleanupStatus =
    aiCoreHealth?.payload?.cleanup && typeof aiCoreHealth.payload.cleanup === "object"
      ? (aiCoreHealth.payload.cleanup as {
          lastCleanupSuccessAt?: string | null;
          lastCleanupError?: string | null;
        })
      : null;
  const aiWorkerReady =
    aiCoreHealth?.ok &&
    aiCoreHealth.payload &&
    aiCoreHealth.payload.workerReady === true &&
    aiCoreHealth.payload.directExecution === true &&
    aiCoreHealth.payload.workerStale !== true;
  const cleanupHealthy =
    readiness.transcriptStorageMode === "disabled"
      ? true
      : Boolean(cleanupStatus?.lastCleanupSuccessAt) && !cleanupStatus?.lastCleanupError;
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
    {
      name: "AI worker",
      status:
        readiness.aiPipelineMode !== "railway_remote"
          ? "pass"
          : !readiness.aiCoreConfigured
            ? "fail"
            : aiWorkerReady
              ? "pass"
              : "fail",
      detail:
        readiness.aiPipelineMode !== "railway_remote"
          ? "Inline fallback mode is active."
          : !readiness.aiCoreConfigured
            ? "AI core URL or shared secret is missing."
            : aiWorkerReady
              ? "Railway worker is healthy and executing jobs directly."
              : typeof aiCoreHealth?.payload?.error === "string"
                ? aiCoreHealth.payload.error
                : "Railway worker is not ready or direct execution is disabled.",
    },
    {
      name: "Retention cleanup",
      status: cleanupHealthy ? "pass" : readiness.transcriptStorageMode === "disabled" ? "pass" : "warn",
      detail:
        readiness.transcriptStorageMode === "disabled"
          ? "No shared transcript retention worker is required in findings-only mode."
          : cleanupHealthy
            ? "Cleanup worker has completed a successful retention run."
            : typeof cleanupStatus?.lastCleanupError === "string"
              ? cleanupStatus.lastCleanupError
              : "Cleanup worker has not yet completed a successful retention run.",
    },
  ];
  const blockingFailures = checks
    .filter((check) => check.status === "fail")
    .map((check) => ({ name: check.name, detail: check.detail }));
  const warnings = checks
    .filter((check) => check.status === "warn")
    .map((check) => ({ name: check.name, detail: check.detail }));
  const launchDecision =
    blockingFailures.length > 0 ? "blocked" : warnings.length > 0 ? "degraded" : "ready";
  const frontendVersion =
    process.env.RELEASE_VERSION?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "dev";
  const hostedVerification =
    aiCoreHealth?.payload?.hostedVerification &&
    typeof aiCoreHealth.payload.hostedVerification === "object"
      ? aiCoreHealth.payload.hostedVerification
      : null;
  const launchCertification =
    aiCoreHealth?.payload?.launchCertification &&
    typeof aiCoreHealth.payload.launchCertification === "object"
      ? aiCoreHealth.payload.launchCertification
      : null;

  return NextResponse.json(
    {
      ok: launchDecision === "ready",
      timestamp: new Date().toISOString(),
      versions: {
        frontendVersion,
        workerVersion:
          aiCoreHealth?.payload && typeof aiCoreHealth.payload.workerVersion === "string"
            ? aiCoreHealth.payload.workerVersion
            : null,
      },
      readiness,
      aiCoreHealth: aiCoreHealth?.payload ?? null,
      hostedVerification,
      launchCertification,
      missing,
      checks,
      blockingFailures,
      warnings,
      launchDecision,
    },
    {
      status: launchDecision === "ready" ? 200 : 503,
    }
  );
}
