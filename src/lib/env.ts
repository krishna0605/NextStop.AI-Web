import "server-only";

export type TranscriptStorageMode = "memory" | "disabled";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function getAppUrl(fallbackOrigin?: string) {
  return (
    readEnv("APP_URL") ||
    readEnv("NEXT_PUBLIC_APP_URL") ||
    fallbackOrigin ||
    "http://localhost:3000"
  );
}

export function getSupabasePublicUrl() {
  return readEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getGoogleOAuthRefreshSupport() {
  return Boolean(readEnv("GOOGLE_CLIENT_ID") && readEnv("GOOGLE_CLIENT_SECRET"));
}

export function getNotionOAuthConfigured() {
  return Boolean(
    readEnv("NOTION_CLIENT_ID") &&
      readEnv("NOTION_CLIENT_SECRET") &&
      (readEnv("NOTION_OAUTH_STATE_SECRET") || readEnv("SUPABASE_SERVICE_ROLE_KEY"))
  );
}

export function getNotionRedirectUri(fallbackOrigin?: string) {
  return (
    readEnv("NOTION_REDIRECT_URI") ||
    new URL("/api/workspace/notion/callback", getAppUrl(fallbackOrigin)).toString()
  );
}

export function getTranscriptStorageMode(): TranscriptStorageMode {
  const configured = readEnv("TRANSCRIPT_STORAGE_MODE");

  if (configured === "memory" || configured === "disabled") {
    return configured;
  }

  return isProductionRuntime() ? "disabled" : "memory";
}

export function getTranscriptRetentionMinutes() {
  const configured = Number(readEnv("TRANSCRIPT_RETENTION_MINUTES"));

  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, 24 * 60);
  }

  return 30;
}

export function allowProductionMemoryTranscriptDownloads() {
  return readEnv("ALLOW_MEMORY_TRANSCRIPT_DOWNLOADS_IN_PRODUCTION") === "true";
}

export function isTranscriptDownloadEnabled() {
  if (getTranscriptStorageMode() !== "memory") {
    return false;
  }

  return !isProductionRuntime() || allowProductionMemoryTranscriptDownloads();
}

export function getRuntimeReadiness() {
  const supabaseConfigured = Boolean(
    readEnv("NEXT_PUBLIC_SUPABASE_URL") && readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
  const supabaseAdminConfigured = Boolean(readEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const googleRefreshConfigured = getGoogleOAuthRefreshSupport();
  const notionOauthConfigured = getNotionOAuthConfigured();
  const transcriptStorageMode = getTranscriptStorageMode();
  const transcriptDownloadsEnabled = isTranscriptDownloadEnabled();

  return {
    appUrl: getAppUrl(),
    supabaseConfigured,
    supabaseAdminConfigured,
    googleOauthConfigured: supabaseConfigured,
    googleRefreshConfigured,
    notionOauthConfigured,
    deepgramConfigured: Boolean(readEnv("DEEPGRAM_API_KEY")),
    openAiConfigured: Boolean(readEnv("OPENAI_API_KEY")),
    razorpayConfigured: Boolean(
      readEnv("RAZORPAY_KEY_ID") &&
        readEnv("RAZORPAY_KEY_SECRET") &&
        readEnv("RAZORPAY_PLAN_ID") &&
        readEnv("RAZORPAY_WEBHOOK_SECRET")
    ),
    transcriptStorageMode,
    transcriptDownloadsEnabled,
    transcriptRetentionMinutes: getTranscriptRetentionMinutes(),
    launchSummary: {
      status:
        supabaseConfigured &&
        supabaseAdminConfigured &&
        notionOauthConfigured
          ? "ready"
          : "attention_required",
      googleMode: googleRefreshConfigured ? "oauth_and_refresh" : "oauth_only",
      notionMode: notionOauthConfigured ? "local_oauth_broker" : "not_configured",
      transcriptMode:
        transcriptStorageMode === "disabled"
          ? "findings_only_launch"
          : transcriptDownloadsEnabled
            ? "temporary_transcript_downloads"
            : "memory_mode_blocked_in_production",
    },
  };
}

export function getMissingEnvSummary() {
  const readiness = getRuntimeReadiness();
  const missing: string[] = [];

  if (isProductionRuntime() && !readEnv("APP_URL") && !readEnv("NEXT_PUBLIC_APP_URL")) {
    missing.push("APP_URL / NEXT_PUBLIC_APP_URL");
  }

  if (!readiness.supabaseConfigured) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!readiness.supabaseAdminConfigured) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!readiness.notionOauthConfigured) {
    missing.push("NOTION_CLIENT_ID / NOTION_CLIENT_SECRET / NOTION_OAUTH_STATE_SECRET");
  }

  if (!readiness.razorpayConfigured) {
    missing.push("Razorpay server credentials");
  }

  return missing;
}
