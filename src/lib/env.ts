import "server-only";

export type TranscriptStorageMode = "memory" | "disabled";
export type AiPipelineMode = "railway_remote" | "inline_legacy";

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

export function getAiCoreApiUrl() {
  return readEnv("AI_CORE_API_URL");
}

export function getAiCoreSharedSecret() {
  return readEnv("AI_CORE_SHARED_SECRET");
}

export function getAiPipelineMode(): AiPipelineMode {
  const configured = readEnv("AI_PIPELINE_MODE");

  if (configured === "railway_remote" || configured === "inline_legacy") {
    return configured;
  }

  return getAiCoreApiUrl() ? "railway_remote" : "inline_legacy";
}

export function getMeetingAudioBucket() {
  return readEnv("SUPABASE_MEETING_AUDIO_BUCKET") || "meeting-audio";
}

export function getMeetingTranscriptBucket() {
  return readEnv("SUPABASE_MEETING_TRANSCRIPT_BUCKET") || "meeting-transcripts";
}

export function getRawAssetRetentionHours() {
  const configured = Number(readEnv("RAW_ASSET_RETENTION_HOURS"));

  if (Number.isFinite(configured) && configured > 0) {
    return Math.min(configured, 7 * 24);
  }

  return 24;
}

export function getHuggingFaceConfigured() {
  return Boolean(
    readEnv("HUGGINGFACE_ASR_ENDPOINT_URL") &&
      readEnv("HUGGINGFACE_DIARIZATION_ENDPOINT_URL") &&
      readEnv("HUGGINGFACE_LLM_ENDPOINT_URL") &&
      readEnv("HUGGINGFACE_API_TOKEN")
  );
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

  return 60;
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
  const aiPipelineMode = getAiPipelineMode();
  const aiCoreConfigured = Boolean(getAiCoreApiUrl() && getAiCoreSharedSecret());
  const huggingFaceConfigured = getHuggingFaceConfigured();

  return {
    appUrl: getAppUrl(),
    supabaseConfigured,
    supabaseAdminConfigured,
    googleOauthConfigured: supabaseConfigured,
    googleRefreshConfigured,
    notionOauthConfigured,
    deepgramConfigured: Boolean(readEnv("DEEPGRAM_API_KEY")),
    openAiConfigured: Boolean(readEnv("OPENAI_API_KEY")),
    aiPipelineMode,
    aiCoreConfigured,
    huggingFaceConfigured,
    meetingAudioBucket: getMeetingAudioBucket(),
    meetingTranscriptBucket: getMeetingTranscriptBucket(),
    razorpayConfigured: Boolean(
      readEnv("RAZORPAY_KEY_ID") &&
        readEnv("RAZORPAY_KEY_SECRET") &&
        readEnv("RAZORPAY_PLAN_ID") &&
        readEnv("RAZORPAY_WEBHOOK_SECRET")
    ),
    transcriptStorageMode,
    transcriptDownloadsEnabled,
    transcriptRetentionMinutes: getTranscriptRetentionMinutes(),
    rawAssetRetentionHours: getRawAssetRetentionHours(),
    launchSummary: {
      status:
        supabaseConfigured &&
        supabaseAdminConfigured &&
        notionOauthConfigured
          ? "ready"
          : "attention_required",
      aiMode:
        aiPipelineMode === "railway_remote"
          ? aiCoreConfigured
            ? "remote_queue_ready"
            : "remote_queue_config_missing"
          : "inline_legacy_fallback",
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

  if (readiness.aiPipelineMode === "railway_remote" && !readiness.aiCoreConfigured) {
    missing.push("AI_CORE_API_URL / AI_CORE_SHARED_SECRET");
  }

  if (!readiness.notionOauthConfigured) {
    missing.push("NOTION_CLIENT_ID / NOTION_CLIENT_SECRET / NOTION_OAUTH_STATE_SECRET");
  }

  if (!readiness.razorpayConfigured) {
    missing.push("Razorpay server credentials");
  }

  return missing;
}
