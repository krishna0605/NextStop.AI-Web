import "server-only";

import type { User } from "@supabase/supabase-js";

import { isNotionBrokerConfigured } from "./notion-workspace";
import type { createClient as createServerClient } from "@/lib/supabase-server";
import {
  getAiPipelineMode,
  getGoogleOAuthRefreshSupport,
  getHuggingFaceConfigured,
  getRawAssetRetentionHours,
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
  DashboardHomeData,
  MeetingArtifactRecord,
  MeetingAssetRecord,
  IntegrationRecord,
  LibraryMeetingCard,
  LibraryPageData,
  MeetingExportRecord,
  MeetingFindingsRecord,
  WebMeetingRecord,
  WorkspaceOverview,
  WorkspaceProviderStatus,
} from "./workspace";

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

function getAiPhaseFromMeeting(meeting: WebMeetingRecord, latestJob: AiJobRecord | null): AiPhase {
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

  if (meeting.status === "transcribing" || meeting.status === "processing") {
    return "transcribing";
  }

  return "queued";
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
        "id,user_id,title,source_type,status,google_event_id,tags,session_metadata,started_at,ended_at,origin_platform,origin_device_id,external_local_id,transcript_storage,created_at,updated_at"
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
        "id,meeting_id,user_id,job_type,artifact_type,status,stage,attempts,provider_metadata,error,started_at,finished_at,created_at,updated_at"
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
        "id,meeting_id,user_id,status,summary_short,summary_full,executive_bullets_json,decisions_json,action_items_json,risks_json,follow_ups_json,email_draft,source_model,created_at,updated_at"
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
      .select("id,meeting_id,user_id,export_type,status,destination,metadata,created_at")
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
        "id,meeting_id,user_id,job_type,artifact_type,status,stage,attempts,provider_metadata,error,started_at,finished_at,created_at,updated_at"
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
        "id,meeting_id,user_id,asset_kind,bucket,path,mime_type,byte_size,checksum,status,expires_at,created_by_job_id,metadata,created_at,updated_at"
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

function buildAiStatusByMeetingId(
  meetings: WebMeetingRecord[],
  jobs: AiJobRecord[],
  artifacts: MeetingArtifactRecord[],
  assets: MeetingAssetRecord[]
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

    acc[meeting.id] = {
      meetingId: meeting.id,
      meetingStatus: meeting.status,
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
      pending: ["queued", "transcribing", "transcript_ready", "analyzing", "processing"].includes(
        meeting.status
      ),
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
    const aiStatusByMeetingId = buildAiStatusByMeetingId(meetings, jobs, artifacts, assets);

    return {
      google,
      notion,
      meetings,
      latestAiJob,
      findingsByMeetingId: Object.fromEntries(
        findings.map((finding) => [finding.meeting_id, finding])
      ),
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
    const [google, notion] = await Promise.all([
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_google", userId),
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_notion", userId),
    ]);

    return {
      google,
      notion,
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
        "id,user_id,title,source_type,status,google_event_id,session_metadata,ended_at,origin_platform,transcript_storage,created_at"
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
    const aiStatusByMeetingId = buildAiStatusByMeetingId(pageMeetings, jobs, artifacts, assets);
    const findingsByMeetingId = Object.fromEntries(
      findings.map((finding) => [finding.meeting_id, finding])
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
        latestError: aiStatus?.latestError ?? null,
        phase: aiStatus?.phase ?? "queued",
        exportCount: exportCountByMeetingId[meeting.id] ?? 0,
        artifactCount: artifactCountByMeetingId[meeting.id] ?? 0,
        transcriptExpiresAt: aiStatus?.transcriptAsset?.expires_at ?? null,
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
          "id,meeting_id,user_id,status,summary_short,summary_full,executive_bullets_json,decisions_json,action_items_json,risks_json,follow_ups_json,email_draft,source_model,created_at,updated_at"
        )
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .maybeSingle(),
      queryClient
        .from("meeting_exports")
        .select("id,meeting_id,user_id,export_type,status,destination,metadata,created_at")
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_notion", userId),
      queryAiJobsForMeetings(queryClient, [meetingId]),
      queryArtifactsForMeetings(queryClient, [meetingId]),
      queryAssetsForMeetings(queryClient, [meetingId]),
    ]);
    const aiStatus = buildAiStatusByMeetingId(
      [meeting as WebMeetingRecord],
      jobs,
      artifacts,
      assets
    )[meetingId];

    return {
      meeting: meeting as WebMeetingRecord,
      findings: (findings as MeetingFindingsRecord | null) ?? null,
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

export function getWorkspaceDisplayName(user: User, profile: ProfileRecord | null) {
  return (
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Operator"
  );
}
