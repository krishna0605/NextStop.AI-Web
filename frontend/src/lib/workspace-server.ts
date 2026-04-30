import "server-only";

import type { User } from "@supabase/supabase-js";

import { isNotionBrokerConfigured } from "./notion-workspace";
import type { createClient as createServerClient } from "@/lib/supabase-server";
import {
  getAppUrl,
  getAiCoreApiUrl,
  getBackendApiUrl,
  getAiPipelineMode,
  getGoogleOAuthRefreshSupport,
  getHuggingFaceConfigured,
  getObservabilityLinks,
  getRawAssetRetentionHours,
  loadAiCoreHealthSnapshot,
  getRuntimeReadiness,
  getTranscriptRetentionMinutes,
  getTranscriptStorageMode,
  isTranscriptDownloadEnabled,
} from "@/lib/env";
import { getTranscriptAvailabilityFromAsset } from "@/lib/ai-pipeline";

import type { ProfileRecord } from "./billing";
import { createAdminClient } from "./supabase-admin";
import type {
  AiJobRecord,
  AiPhase,
  AiStatusSnapshot,
  CaptureRuntimeSnapshot,
  DashboardHomeData,
  MeetingArtifactRecord,
  MeetingAssetRecord,
  MeetingCaptureSessionRecord,
  IntegrationRecord,
  LibraryMeetingCard,
  LibraryPageData,
  MeetingExportRecord,
  MeetingFindingsRecord,
  OpsReadinessData,
  OpsRecentAiFailure,
  OpsRecentDegradedMeeting,
  OpsRecentExportFailure,
  WebMeetingRecord,
  WorkspaceOverview,
  WorkspaceProviderStatus,
} from "./workspace";

const CAPTURE_STALE_THRESHOLD_MS = 2 * 60 * 1000;

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

function getAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function isWorkspaceSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  };

  const combined = [
    maybeError.code,
    maybeError.message,
    maybeError.details,
    maybeError.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("schema cache") ||
    combined.includes("relation") ||
    combined.includes("does not exist") ||
    combined.includes("column") ||
    maybeError.code === "42P01" ||
    maybeError.code === "42703" ||
    maybeError.code === "PGRST204"
  );
}

function logWorkspaceFallback(label: string, error: unknown) {
  console.warn(`[workspace] Falling back in ${label}`, error);
}

async function measureWorkspaceCall<T>(label: string, work: () => Promise<T>) {
  const startedAt = performance.now();
  try {
    return await work();
  } finally {
    console.info("[workspace-perf]", {
      label,
      durationMs: Math.round(performance.now() - startedAt),
    });
  }
}

function getMetadataRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getMetadataString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isCaptureSessionActive(status: MeetingCaptureSessionRecord["status"]) {
  return !["canceled", "failed"].includes(status);
}

function isCaptureSessionFinalizing(status: MeetingCaptureSessionRecord["status"]) {
  return ["ending", "sealed", "materializing_audio", "queued_for_transcription"].includes(status);
}

function getCaptureSessionActivityAt(session: MeetingCaptureSessionRecord) {
  return (
    session.last_client_heartbeat_at ??
    session.last_chunk_received_at ??
    session.updated_at ??
    session.started_at ??
    null
  );
}

function isCaptureSessionStale(session: MeetingCaptureSessionRecord) {
  if (!isCaptureSessionActive(session.status)) {
    return false;
  }

  const lastActivityAt = getCaptureSessionActivityAt(session);

  if (!lastActivityAt) {
    return false;
  }

  const lastActivity = new Date(lastActivityAt).getTime();

  if (!Number.isFinite(lastActivity)) {
    return false;
  }

  return Date.now() - lastActivity > CAPTURE_STALE_THRESHOLD_MS;
}

function getAiPhaseFromMeeting(meeting: WebMeetingRecord, latestJob: AiJobRecord | null): AiPhase {
  if (meeting.status === "canceled" || latestJob?.status === "canceled") {
    return "canceled";
  }

  if (meeting.status === "failed" || latestJob?.status === "failed") {
    return "failed";
  }

  if (meeting.status === "ready" || meeting.status === "partial_success") {
    return "ready";
  }

  if (meeting.status === "transcript_ready") {
    return "transcript_ready";
  }

  if (meeting.status === "analyzing") {
    return "analyzing";
  }

  if (
    meeting.status === "finalizing_upload" ||
    meeting.status === "transcribing" ||
    meeting.status === "processing" ||
    meeting.status === "cancel_requested"
  ) {
    return "transcribing";
  }

  return "queued";
}

function getSurfaceState(args: {
  meeting: WebMeetingRecord;
  latestError: string | null;
  findings?: MeetingFindingsRecord | null;
}) {
  if (args.meeting.status === "canceled" || args.meeting.status === "cancel_requested") {
    return "processing" as const;
  }

  if (args.meeting.status === "failed" || args.latestError) {
    return "needs_retry" as const;
  }

  if (
    args.meeting.status === "partial_success" ||
    args.findings?.generation_status === "degraded_success"
  ) {
    return "degraded" as const;
  }

  if (args.meeting.status === "ready" || args.meeting.status === "transcript_ready") {
    return "ready" as const;
  }

  return "processing" as const;
}

function encodeLibraryCursor(createdAt: string | null, meetingId: string) {
  if (!createdAt) {
    return null;
  }

  return Buffer.from(JSON.stringify({ createdAt, meetingId }), "utf8").toString("base64url");
}

function decodeLibraryCursor(cursor: string | null | undefined) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: string;
      meetingId?: string;
    };

    if (!parsed.createdAt || !parsed.meetingId) {
      return null;
    }

    return {
      createdAt: parsed.createdAt,
      meetingId: parsed.meetingId,
    };
  } catch {
    return null;
  }
}

async function queryMaybeSingle<T>(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  table: string,
  userId: string
) {
  try {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as T | null) ?? null;
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback(`queryMaybeSingle(${table})`, error);
      return null;
    }

    throw error;
  }
}

async function queryMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string,
  limit = 6
) {
  try {
    const { data, error } = await client
      .from("web_meetings")
      .select(
        "id,user_id,title,source_type,status,google_event_id,tags,session_metadata,cancel_requested_at,canceled_at,current_capture_session_id,started_at,ended_at,origin_platform,origin_device_id,external_local_id,transcript_storage,created_at,updated_at"
      )
      .eq("user_id", userId)
      .order("started_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as WebMeetingRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryLatestAiJob(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    const { data, error } = await client
      .from("ai_jobs")
      .select(
        "id,meeting_id,user_id,job_type,artifact_type,status,stage,attempts,provider_metadata,error,cancel_requested_at,canceled_at,cancel_reason,cancel_requested_by,started_at,finished_at,created_at,updated_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as AiJobRecord | null) ?? null;
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryLatestAiJob", error);
      return null;
    }

    throw error;
  }
}

async function queryFindingsForMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  meetingIds: string[]
) {
  if (meetingIds.length === 0) {
    return [] as MeetingFindingsRecord[];
  }

  try {
    const { data, error } = await client
      .from("meeting_findings")
      .select(
        "id,meeting_id,user_id,status,summary_short,summary_full,executive_bullets_json,decisions_json,action_items_json,risks_json,follow_ups_json,email_draft,source_model,generation_mode,generation_status,fallback_reason,created_at,updated_at"
      )
      .in("meeting_id", meetingIds);

    if (error) {
      throw error;
    }

    return (data as MeetingFindingsRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryFindingsForMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryExportsForMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  meetingIds: string[]
) {
  if (meetingIds.length === 0) {
    return [] as MeetingExportRecord[];
  }

  try {
    const { data, error } = await client
      .from("meeting_exports")
      .select(
        "id,meeting_id,user_id,export_type,status,destination,latest_error,completed_at,duration_ms,metadata,created_at"
      )
      .in("meeting_id", meetingIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data as MeetingExportRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryExportsForMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryAiJobsForMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  meetingIds: string[]
) {
  if (meetingIds.length === 0) {
    return [] as AiJobRecord[];
  }

  try {
    const { data, error } = await client
      .from("ai_jobs")
      .select(
        "id,meeting_id,user_id,job_type,artifact_type,status,stage,attempts,provider_metadata,error,cancel_requested_at,canceled_at,cancel_reason,cancel_requested_by,started_at,finished_at,created_at,updated_at"
      )
      .in("meeting_id", meetingIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data as AiJobRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryAiJobsForMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryArtifactsForMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  meetingIds: string[]
) {
  if (meetingIds.length === 0) {
    return [] as MeetingArtifactRecord[];
  }

  try {
    const { data, error } = await client
      .from("meeting_artifacts")
      .select(
        "id,meeting_id,user_id,artifact_type,status,payload_json,payload_text,source_model,version,metadata,created_by_job_id,created_at,updated_at"
      )
      .in("meeting_id", meetingIds);

    if (error) {
      throw error;
    }

    return (data as MeetingArtifactRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryArtifactsForMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryAssetsForMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  meetingIds: string[]
) {
  if (meetingIds.length === 0) {
    return [] as MeetingAssetRecord[];
  }

  try {
    const { data, error } = await client
      .from("meeting_assets")
      .select(
        "id,meeting_id,user_id,asset_kind,bucket,path,mime_type,byte_size,checksum,status,expires_at,deleted_at,deletion_status,deletion_error,created_by_job_id,metadata,created_at,updated_at"
      )
      .in("meeting_id", meetingIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data as MeetingAssetRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryAssetsForMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryCaptureSessions(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    const { data, error } = await client
      .from("meeting_capture_sessions")
      .select(
        "id,meeting_id,user_id,status,capture_mode,source_surface,started_at,ended_at,sealed_at,cancel_requested_at,canceled_at,last_client_heartbeat_at,last_chunk_received_at,total_chunks_received,total_bytes_received,final_asset_bucket,final_asset_path,final_asset_status,error,metadata,created_at,updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(8);

    if (error) {
      throw error;
    }

    return (data as MeetingCaptureSessionRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryCaptureSessions", error);
      return [] as MeetingCaptureSessionRecord[];
    }

    throw error;
  }
}

async function queryMeetingStatusCount(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string,
  status: WebMeetingRecord["status"]
) {
  try {
    const { count, error } = await client
      .from("web_meetings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", status);

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback(`queryMeetingStatusCount(${status})`, error);
      return 0;
    }

    throw error;
  }
}

async function queryAiJobStatusCount(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string,
  status: AiJobRecord["status"]
) {
  try {
    const { count, error } = await client
      .from("ai_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", status);

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback(`queryAiJobStatusCount(${status})`, error);
      return 0;
    }

    throw error;
  }
}

function buildAiStatusByMeetingId(
  meetings: WebMeetingRecord[],
  jobs: AiJobRecord[],
  artifacts: MeetingArtifactRecord[],
  assets: MeetingAssetRecord[],
  findingsByMeetingId: Record<string, MeetingFindingsRecord | undefined>
) {
  return meetings.reduce<Record<string, AiStatusSnapshot | undefined>>((acc, meeting) => {
    const meetingJobs = jobs.filter((job) => job.meeting_id === meeting.id);
    const latestJob = meetingJobs[0] ?? null;
    const meetingArtifacts = artifacts.filter((artifact) => artifact.meeting_id === meeting.id);
    const meetingAssets = assets.filter((asset) => asset.meeting_id === meeting.id);
    const transcriptAsset =
      meetingAssets.find((asset) => asset.asset_kind === "transcript_text") ?? null;
    const rawAudioAsset =
      meetingAssets.find((asset) => asset.asset_kind === "audio_raw") ?? null;
    const latestJobMetadata = getMetadataRecord(latestJob?.provider_metadata);
    const timings = getMetadataRecord(latestJobMetadata.timings);
    const latestError =
      latestJob?.error?.trim() ||
      getMetadataString(getMetadataRecord(latestJobMetadata.remote_dispatch), "error") ||
      null;
    const sessionMetadata = getMetadataRecord(meeting.session_metadata);
    const findings = findingsByMeetingId[meeting.id] ?? null;
    const captureStatus = getMetadataString(sessionMetadata, "capture_state") as
      | AiStatusSnapshot["captureStatus"]
      | null;
    const cancelable = [
      "finalizing_upload",
      "queued",
      "transcribing",
      "transcript_ready",
      "analyzing",
    ].includes(meeting.status);

    acc[meeting.id] = {
      meetingId: meeting.id,
      meetingStatus: meeting.status,
      captureStatus,
      latestJob,
      artifacts: meetingArtifacts,
      transcriptAsset,
      rawAudioAsset,
      phase: getAiPhaseFromMeeting(meeting, latestJob),
      transcriptReadyAt:
        getMetadataString(sessionMetadata, "transcript_ready_at") ||
        getMetadataString(latestJobMetadata, "transcriptReadyAt") ||
        null,
      findingsReadyAt:
        getMetadataString(sessionMetadata, "findings_ready_at") ||
        getMetadataString(latestJobMetadata, "findingsReadyAt") ||
        null,
      timings: Object.keys(timings).length > 0 ? timings : null,
      latestError,
      retryCount: latestJob?.attempts ?? null,
      findingsGenerationMode: findings?.generation_mode ?? null,
      findingsGenerationStatus: findings?.generation_status ?? null,
      findingsFallbackReason: findings?.fallback_reason ?? null,
      surfaceState: getSurfaceState({ meeting, latestError, findings }),
      pending: [
        "finalizing_upload",
        "queued",
        "transcribing",
        "transcript_ready",
        "analyzing",
        "processing",
        "cancel_requested",
      ].includes(meeting.status),
      cancelable,
      temporaryTranscriptReady: Boolean(transcriptAsset?.expires_at),
    };

    return acc;
  }, {});
}

export function getWorkspaceProviderStatus(): WorkspaceProviderStatus {
  const readiness = getRuntimeReadiness();

  return {
    deepgramConfigured: readiness.deepgramConfigured,
    openAiConfigured: readiness.openAiConfigured,
    aiCoreConfigured: readiness.aiCoreConfigured,
    huggingFaceConfigured: getHuggingFaceConfigured(),
    googleConfigured: readiness.supabaseConfigured,
    googleRefreshConfigured: getGoogleOAuthRefreshSupport(),
    notionConfigured: isNotionBrokerConfigured(),
    transcriptDownloadsEnabled: isTranscriptDownloadEnabled(),
    transcriptStorageMode: getTranscriptStorageMode(),
    transcriptRetentionMinutes: getTranscriptRetentionMinutes(),
    rawAssetRetentionHours: getRawAssetRetentionHours(),
    aiPipelineMode: getAiPipelineMode(),
  };
}

export async function loadWorkspaceOverview(
  supabase: ServerClient,
  user: User
): Promise<WorkspaceOverview> {
  return measureWorkspaceCall("loadWorkspaceOverview", async () => {
    const admin = getAdminClient();
    const queryClient = admin ?? supabase;

    const [google, notion, meetings, latestAiJob] = await Promise.all([
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_google", user.id),
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_notion", user.id),
      queryMeetings(queryClient, user.id),
      queryLatestAiJob(queryClient, user.id),
    ]);

    const meetingIds = meetings.map((meeting) => meeting.id);
    const [findings, exports, jobs, artifacts, assets] = await Promise.all([
      queryFindingsForMeetings(queryClient, meetingIds),
      queryExportsForMeetings(queryClient, meetingIds),
      queryAiJobsForMeetings(queryClient, meetingIds),
      queryArtifactsForMeetings(queryClient, meetingIds),
      queryAssetsForMeetings(queryClient, meetingIds),
    ]);
    const findingsByMeetingId = Object.fromEntries(
      findings.map((finding) => [finding.meeting_id, finding])
    );
    const aiStatusByMeetingId = buildAiStatusByMeetingId(
      meetings,
      jobs,
      artifacts,
      assets,
      findingsByMeetingId
    );

    return {
      google,
      notion,
      meetings,
      latestAiJob,
      findingsByMeetingId,
      exportsByMeetingId: exports.reduce<Record<string, MeetingExportRecord[]>>(
        (acc, item) => {
          acc[item.meeting_id] = acc[item.meeting_id] ?? [];
          acc[item.meeting_id].push(item);
          return acc;
        },
        {}
      ),
      aiStatusByMeetingId,
      providerStatus: getWorkspaceProviderStatus(),
    };
  });
}

export async function loadDashboardHomeData(
  supabase: ServerClient,
  userId: string
): Promise<DashboardHomeData> {
  return measureWorkspaceCall("loadDashboardHomeData", async () => {
    const admin = getAdminClient();
    const queryClient = admin ?? supabase;
    const [google, notion, latestAiJob, queuedCount, runningCount, failedCount, cancelRequestedCount] =
      await Promise.all([
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_google", userId),
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_notion", userId),
      queryLatestAiJob(queryClient, userId),
      queryAiJobStatusCount(queryClient, userId, "queued"),
      queryAiJobStatusCount(queryClient, userId, "running"),
      queryAiJobStatusCount(queryClient, userId, "failed"),
      queryAiJobStatusCount(queryClient, userId, "cancel_requested"),
    ]);

    return {
      google,
      notion,
      latestAiJob,
      aiQueueStatus: {
        queuedCount,
        runningCount,
        failedCount,
        cancelRequestedCount,
      },
      providerStatus: getWorkspaceProviderStatus(),
    };
  });
}

async function queryLibraryMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string,
  args: { query: string; cursor: string | null; limit: number }
) {
  try {
    let builder = client
      .from("web_meetings")
      .select(
        "id,user_id,title,source_type,status,google_event_id,session_metadata,cancel_requested_at,canceled_at,current_capture_session_id,ended_at,origin_platform,transcript_storage,created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(args.limit + 1);

    if (args.query) {
      const escaped = args.query.replace(/[%_,]/g, " ");
      builder = builder.ilike("title", `%${escaped}%`);
    }

    const decodedCursor = decodeLibraryCursor(args.cursor);
    if (decodedCursor) {
      builder = builder.or(
        `created_at.lt.${decodedCursor.createdAt},and(created_at.eq.${decodedCursor.createdAt},id.lt.${decodedCursor.meetingId})`
      );
    }

    const { data, error } = await builder;

    if (error) {
      throw error;
    }

    return (data as WebMeetingRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryLibraryMeetings", error);
      return [];
    }

    throw error;
  }
}

export async function loadLibraryPageData(
  supabase: ServerClient,
  userId: string,
  args: { q?: string; cursor?: string | null; limit?: number }
): Promise<LibraryPageData> {
  return measureWorkspaceCall("loadLibraryPageData", async () => {
    const admin = getAdminClient();
    const queryClient = admin ?? supabase;
    const query = args.q?.trim() ?? "";
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const meetings = await queryLibraryMeetings(queryClient, userId, {
      query,
      cursor: args.cursor ?? null,
      limit,
    });

    const hasMore = meetings.length > limit;
    const pageMeetings = hasMore ? meetings.slice(0, limit) : meetings;
    const meetingIds = pageMeetings.map((meeting) => meeting.id);
    const [findings, jobs, exports, artifacts, assets] = await Promise.all([
      queryFindingsForMeetings(queryClient, meetingIds),
      queryAiJobsForMeetings(queryClient, meetingIds),
      queryExportsForMeetings(queryClient, meetingIds),
      queryArtifactsForMeetings(queryClient, meetingIds),
      queryAssetsForMeetings(queryClient, meetingIds),
    ]);
    const findingsByMeetingId = Object.fromEntries(
      findings.map((finding) => [finding.meeting_id, finding])
    );
    const aiStatusByMeetingId = buildAiStatusByMeetingId(
      pageMeetings,
      jobs,
      artifacts,
      assets,
      findingsByMeetingId
    );
    const exportCountByMeetingId = exports.reduce<Record<string, number>>((acc, item) => {
      acc[item.meeting_id] = (acc[item.meeting_id] ?? 0) + 1;
      return acc;
    }, {});
    const artifactCountByMeetingId = artifacts.reduce<Record<string, number>>((acc, item) => {
      acc[item.meeting_id] = (acc[item.meeting_id] ?? 0) + 1;
      return acc;
    }, {});

    const cards: LibraryMeetingCard[] = pageMeetings.map((meeting) => {
      const aiStatus = aiStatusByMeetingId[meeting.id];
      const sessionMetadata = getMetadataRecord(meeting.session_metadata);

      return {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        sourceType: meeting.source_type,
        originPlatform: meeting.origin_platform ?? "web",
        googleEventId: meeting.google_event_id ?? null,
        createdAt: meeting.created_at ?? null,
        endedAt: meeting.ended_at ?? null,
        scheduledStart: getMetadataString(sessionMetadata, "scheduled_start"),
        summaryShort: findingsByMeetingId[meeting.id]?.summary_short ?? null,
        latestAiStage: aiStatus?.latestJob?.stage ?? null,
        latestAiJobStatus: aiStatus?.latestJob?.status ?? null,
        latestError: aiStatus?.latestError ?? null,
        phase: aiStatus?.phase ?? "queued",
        captureStatus: aiStatus?.captureStatus ?? null,
        cancelable: aiStatus?.cancelable ?? false,
        temporaryTranscriptReady: aiStatus?.temporaryTranscriptReady ?? false,
        exportCount: exportCountByMeetingId[meeting.id] ?? 0,
        artifactCount: artifactCountByMeetingId[meeting.id] ?? 0,
        transcriptExpiresAt: aiStatus?.transcriptAsset?.expires_at ?? null,
        findingsGenerationMode: findingsByMeetingId[meeting.id]?.generation_mode ?? null,
        findingsGenerationStatus: findingsByMeetingId[meeting.id]?.generation_status ?? null,
        findingsFallbackReason: findingsByMeetingId[meeting.id]?.fallback_reason ?? null,
        reviewState: aiStatus?.surfaceState ?? "processing",
        meetUrl: getMetadataString(sessionMetadata, "meet_url"),
        eventUrl: getMetadataString(sessionMetadata, "event_url"),
      };
    });

    const lastCard = cards[cards.length - 1] ?? null;

    return {
      cards,
      query,
      limit,
      nextCursor: hasMore && lastCard ? encodeLibraryCursor(lastCard.createdAt, lastCard.id) : null,
      providerStatus: getWorkspaceProviderStatus(),
    };
  });
}

export async function loadMeetingDetail(
  supabase: ServerClient,
  userId: string,
  meetingId: string
) {
  const admin = getAdminClient();
  const queryClient = admin ?? supabase;

  try {
    const { data: meeting, error: meetingError } = await queryClient
      .from("web_meetings")
      .select("*")
      .eq("id", meetingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (meetingError) {
      throw meetingError;
    }

    if (!meeting) {
      return null;
    }

    const [{ data: findings }, { data: exports }, notion, jobs, artifacts, assets] =
      await Promise.all([
      queryClient
        .from("meeting_findings")
        .select(
          "id,meeting_id,user_id,status,summary_short,summary_full,executive_bullets_json,decisions_json,action_items_json,risks_json,follow_ups_json,email_draft,source_model,generation_mode,generation_status,fallback_reason,created_at,updated_at"
        )
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .maybeSingle(),
      queryClient
        .from("meeting_exports")
        .select(
          "id,meeting_id,user_id,export_type,status,destination,latest_error,completed_at,duration_ms,metadata,created_at"
        )
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_notion", userId),
      queryAiJobsForMeetings(queryClient, [meetingId]),
      queryArtifactsForMeetings(queryClient, [meetingId]),
      queryAssetsForMeetings(queryClient, [meetingId]),
    ]);
    const findingsRecord = (findings as MeetingFindingsRecord | null) ?? null;
    const aiStatus = buildAiStatusByMeetingId(
      [meeting as WebMeetingRecord],
      jobs,
      artifacts,
      assets,
      findingsRecord ? { [meetingId]: findingsRecord } : {}
    )[meetingId];

    return {
      meeting: meeting as WebMeetingRecord,
      findings: findingsRecord,
      exports: (exports as MeetingExportRecord[] | null) ?? [],
      artifacts,
      aiStatus: aiStatus ?? null,
      notion,
      transcriptAvailability: getTranscriptAvailabilityFromAsset(
        aiStatus?.transcriptAsset ?? null,
        meeting as WebMeetingRecord
      ),
      providerStatus: getWorkspaceProviderStatus(),
    };
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("loadMeetingDetail", error);
      return null;
    }

    throw error;
  }
}

async function queryRecentAiFailures(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    const { data, error } = await client
      .from("ai_jobs")
      .select(
        "id,meeting_id,job_type,status,stage,error,provider_metadata,created_at"
      )
      .eq("user_id", userId)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      throw error;
    }

    return ((data as AiJobRecord[] | null) ?? []).map<OpsRecentAiFailure>((item) => {
      const metadata = getMetadataRecord(item.provider_metadata);
      return {
        id: item.id,
        meetingId: item.meeting_id,
        jobType: item.job_type,
        stage: item.stage,
        status: item.status,
        error:
          item.error?.trim() ||
          getMetadataString(getMetadataRecord(metadata.remote_dispatch), "error") ||
          "Unknown AI failure.",
        executionMode: getMetadataString(metadata, "execution_mode"),
        findingsGenerationStatus:
          typeof getMetadataRecord(metadata.findings).status === "string"
            ? (getMetadataRecord(metadata.findings).status as OpsRecentAiFailure["findingsGenerationStatus"])
            : null,
        createdAt: item.created_at ?? null,
      };
    });
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryRecentAiFailures", error);
      return [] as OpsRecentAiFailure[];
    }

    throw error;
  }
}

async function queryRecentExportFailures(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    const { data, error } = await client
      .from("meeting_exports")
      .select(
        "id,meeting_id,export_type,status,destination,latest_error,duration_ms,metadata,created_at"
      )
      .eq("user_id", userId)
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      throw error;
    }

    return ((data as MeetingExportRecord[] | null) ?? []).map<OpsRecentExportFailure>((item) => ({
      id: item.id,
      meetingId: item.meeting_id,
      exportType: item.export_type,
      status: item.status,
      destination: item.destination ?? null,
      latestError:
        item.latest_error?.trim() ||
        getMetadataString(getMetadataRecord(item.metadata), "error") ||
        null,
      durationMs: item.duration_ms ?? null,
      createdAt: item.created_at ?? null,
    }));
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryRecentExportFailures", error);
      return [] as OpsRecentExportFailure[];
    }

    throw error;
  }
}

async function queryRecentDegradedMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string
) {
  try {
    const { data, error } = await client
      .from("meeting_findings")
      .select("meeting_id,summary_short,generation_mode,generation_status,fallback_reason,updated_at")
      .eq("user_id", userId)
      .eq("generation_status", "degraded_success")
      .order("updated_at", { ascending: false })
      .limit(8);

    if (error) {
      throw error;
    }

    const findings = (data as MeetingFindingsRecord[] | null) ?? [];

    if (findings.length === 0) {
      return [] as OpsRecentDegradedMeeting[];
    }

    const meetingIds = findings.map((item) => item.meeting_id ?? "").filter(Boolean);
    const { data: meetingsData, error: meetingsError } = await client
      .from("web_meetings")
      .select("id,title")
      .in("id", meetingIds);

    if (meetingsError) {
      throw meetingsError;
    }

    const titles = new Map<string, string>(
      ((meetingsData as { id: string; title: string }[] | null) ?? []).map((item) => [
        item.id,
        item.title,
      ])
    );

    return findings.map<OpsRecentDegradedMeeting>((item) => ({
      meetingId: item.meeting_id ?? "unknown",
      title: titles.get(item.meeting_id ?? "") ?? item.summary_short ?? "Meeting",
      generationMode: item.generation_mode ?? "fallback_local",
      generationStatus: item.generation_status ?? "degraded_success",
      fallbackReason: item.fallback_reason ?? null,
      updatedAt: item.updated_at ?? null,
    }));
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryRecentDegradedMeetings", error);
      return [] as OpsRecentDegradedMeeting[];
    }

    throw error;
  }
}

export async function loadOpsReadinessData(
  supabase: ServerClient,
  userId: string
): Promise<OpsReadinessData> {
  return measureWorkspaceCall("loadOpsReadinessData", async () => {
    const admin = getAdminClient();
    const queryClient = admin ?? supabase;
    const readiness = getRuntimeReadiness();
    const aiCoreHealth =
      readiness.aiPipelineMode === "railway_remote" && readiness.aiCoreConfigured
        ? await loadAiCoreHealthSnapshot()
        : null;
    const [
      recentAiFailures,
      recentExportFailures,
      recentDegradedMeetings,
      captureSessions,
      transcriptReadyAwaitingAnalysisCount,
      cancelRequestedJobCount,
    ] = await Promise.all([
      queryRecentAiFailures(queryClient, userId),
      queryRecentExportFailures(queryClient, userId),
      queryRecentDegradedMeetings(queryClient, userId),
      queryCaptureSessions(queryClient, userId),
      queryMeetingStatusCount(queryClient, userId, "transcript_ready"),
      queryAiJobStatusCount(queryClient, userId, "cancel_requested"),
    ]);
    const workerReady =
      aiCoreHealth?.ok === true &&
      aiCoreHealth.payload?.workerReady === true &&
      aiCoreHealth.payload?.directExecution === true &&
      aiCoreHealth.payload?.workerStale !== true;
    const cleanup = (aiCoreHealth?.payload?.cleanup as OpsReadinessData["cleanup"] | null) ?? null;
    const security =
      (aiCoreHealth?.payload?.security as OpsReadinessData["security"] | null) ?? null;
    const hostedVerification =
      (aiCoreHealth?.payload?.hostedVerification as OpsReadinessData["hostedVerification"] | null) ??
      null;
    const launchCertification =
      (aiCoreHealth?.payload?.launchCertification as OpsReadinessData["launchCertification"] | null) ??
      null;
    const captureSessionMeetingIds = Array.from(
      new Set(captureSessions.map((session) => session.meeting_id).filter(Boolean))
    );
    const captureSessionTitles = new Map<string, string>();
    if (captureSessionMeetingIds.length > 0) {
      const { data: captureMeetingsData, error: captureMeetingsError } = await queryClient
        .from("web_meetings")
        .select("id,title")
        .in("id", captureSessionMeetingIds)
        .eq("user_id", userId);

      if (captureMeetingsError) {
        throw captureMeetingsError;
      }

      for (const item of ((captureMeetingsData as { id: string; title: string }[] | null) ?? [])) {
        captureSessionTitles.set(item.id, item.title);
      }
    }
    const captureRuntime: CaptureRuntimeSnapshot = {
      activeCaptureSessionCount: captureSessions.filter((session) =>
        isCaptureSessionActive(session.status)
      ).length,
      staleCaptureSessionCount: captureSessions.filter((session) =>
        isCaptureSessionStale(session)
      ).length,
      finalizationBacklogCount: captureSessions.filter((session) =>
        isCaptureSessionFinalizing(session.status)
      ).length,
      transcriptReadyAwaitingAnalysisCount,
      cancelRequestedJobCount,
      sessions: captureSessions.map((session) => ({
        captureSessionId: session.id,
        meetingId: session.meeting_id,
        meetingTitle: captureSessionTitles.get(session.meeting_id) ?? null,
        status: session.status,
        lastHeartbeatAt: session.last_client_heartbeat_at ?? null,
        lastChunkReceivedAt: session.last_chunk_received_at ?? null,
        totalChunksReceived: session.total_chunks_received ?? 0,
        totalBytesReceived: session.total_bytes_received ?? 0,
        error: session.error ?? null,
      })),
    };

    const checks: OpsReadinessData["checks"] = [
      {
        name: "Frontend app URL",
        status: readiness.appUrl ? "pass" : "fail",
        detail: readiness.appUrl || "APP_URL / NEXT_PUBLIC_APP_URL is missing.",
      },
      {
        name: "Backend routing",
        status: readiness.backendApiConfigured ? "pass" : "warn",
        detail: readiness.backendApiConfigured
          ? "Public backend URL is configured for external backend-owned endpoints."
          : "NEXT_PUBLIC_BACKEND_URL is not configured.",
      },
      {
        name: "AI core direct execution",
        status:
          readiness.aiPipelineMode !== "railway_remote"
            ? "warn"
            : workerReady
              ? "pass"
              : "fail",
        detail:
          readiness.aiPipelineMode !== "railway_remote"
            ? "Inline legacy mode is active."
            : workerReady
              ? "Railway worker is executing jobs directly."
              : typeof aiCoreHealth?.payload?.error === "string"
                ? aiCoreHealth.payload.error
                : "Railway worker is not ready or direct execution is disabled.",
      },
      {
        name: "Provider secrets",
        status:
          readiness.deepgramConfigured && readiness.openAiConfigured ? "pass" : "fail",
        detail:
          readiness.deepgramConfigured && readiness.openAiConfigured
            ? "Deepgram and OpenAI server credentials are configured."
            : "One or more provider credentials are missing.",
      },
      {
        name: "Retention cleanup",
        status:
          readiness.transcriptStorageMode === "disabled"
            ? "pass"
            : cleanup?.lastCleanupError
              ? "fail"
              : cleanup?.lastCleanupSuccessAt
                ? "pass"
                : "warn",
        detail:
          readiness.transcriptStorageMode === "disabled"
            ? "Transcript retention is disabled in this runtime."
            : cleanup?.lastCleanupError
              ? cleanup.lastCleanupError
              : cleanup?.lastCleanupSuccessAt
                ? "Cleanup worker has completed a successful retention run."
                : "Cleanup worker has not completed a successful retention run yet.",
      },
    ];

    const blockingFailures = checks
      .filter((check) => check.status === "fail")
      .map((check) => ({ name: check.name, detail: check.detail }));
    const warnings = checks
      .filter((check) => check.status === "warn")
      .map((check) => ({ name: check.name, detail: check.detail }));
    const launchDecision =
      blockingFailures.length > 0
        ? "blocked"
        : warnings.length > 0 || recentDegradedMeetings.length > 0
          ? "degraded"
          : "ready";

    return {
      checks,
      blockingFailures,
      warnings,
      launchDecision,
      aiCoreHealth: aiCoreHealth?.payload ?? null,
      recentAiFailures,
      recentDegradedMeetings,
      recentExportFailures,
      appUrl: getAppUrl(),
      backendApiUrl: getBackendApiUrl(),
      aiCoreApiUrl: getAiCoreApiUrl(),
      workerReady,
      queueName:
        aiCoreHealth?.payload && typeof aiCoreHealth.payload.queue === "string"
          ? aiCoreHealth.payload.queue
          : null,
      lastWorkerHeartbeatAt:
        aiCoreHealth?.payload && typeof aiCoreHealth.payload.lastWorkerHeartbeatAt === "string"
          ? aiCoreHealth.payload.lastWorkerHeartbeatAt
          : null,
      workerVersion:
        aiCoreHealth?.payload && typeof aiCoreHealth.payload.workerVersion === "string"
          ? aiCoreHealth.payload.workerVersion
          : null,
      cleanup,
      security,
      hostedVerification,
      launchCertification,
      captureRuntime,
      lastDeployHint:
        "Use the post-deploy verification workflow summary to confirm the latest Vercel and Railway release.",
      observabilityLinks: getObservabilityLinks(),
    };
  });
}

export function getWorkspaceDisplayName(user: User, profile: ProfileRecord | null) {
  return (
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Operator"
  );
}
