import { createHash } from "node:crypto";

import {
  buildCanonicalArtifact,
  canonicalArtifactToMarkdown,
  deriveStructuredMeetingContent,
  parseCanonicalArtifact,
} from "./meeting-artifacts.js";
import { getAiQueue } from "./queue.js";
import {
  captureException,
  logEvent,
  recordAiJobOutcome,
  runWithTraceSpan,
} from "./observability.js";
import { createAdminClient } from "./supabase.js";
import { transcribeWithDeepgramResult, type DeepgramParagraph } from "./deepgram.js";
import { fallbackFindings, generateMeetingFindings } from "./workspace-ai.js";
import { markWorkerDegraded } from "./worker-state.js";

type MeetingStatus =
  | "finalizing_upload"
  | "queued"
  | "transcribing"
  | "transcript_ready"
  | "analyzing"
  | "processing"
  | "cancel_requested"
  | "canceled"
  | "ready"
  | "failed"
  | "partial_success";

type MeetingAssetKind = "audio_raw" | "transcript_text";
type MeetingArtifactType =
  | "canonical_json"
  | "canonical_markdown"
  | "summary"
  | "action_items"
  | "email_draft";
type AiJobStage =
  | "queued"
  | "uploaded"
  | "materializing_audio"
  | "transcribing"
  | "normalizing"
  | "extracting"
  | "assembling"
  | "regenerating"
  | "canceled"
  | "completed";

type AiJobRecord = {
  id: string;
  meeting_id: string;
  user_id: string;
  job_type: "transcribe" | "analyze" | "regenerate_artifact" | string;
  artifact_type?: MeetingArtifactType | null;
  status: string;
  stage: AiJobStage;
  attempts?: number | null;
  provider_metadata?: Record<string, unknown> | null;
  error?: string | null;
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
  cancel_reason?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

type MeetingRecord = {
  id: string;
  user_id: string;
  title: string;
  source_type: string;
  status: MeetingStatus;
  origin_platform?: string | null;
  transcript_storage?: string | null;
  session_metadata?: Record<string, unknown> | null;
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
};

type MeetingAssetRecord = {
  id: string;
  meeting_id: string;
  user_id: string;
  asset_kind: MeetingAssetKind;
  bucket: string;
  path: string;
  mime_type?: string | null;
  byte_size?: number | null;
  checksum?: string | null;
  status?: string | null;
  expires_at?: string | null;
  deleted_at?: string | null;
  deletion_status?: string | null;
  deletion_error?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

type MeetingArtifactRecord = {
  artifact_type: MeetingArtifactType;
  payload_json?: Record<string, unknown> | null;
  payload_text?: string | null;
};

type MeetingFindingsRecord = {
  id?: string;
  meeting_id?: string;
  user_id?: string;
  status?: string;
  summary_short?: string | null;
  summary_full?: string | null;
  executive_bullets_json?: string[] | null;
  decisions_json?: string[] | null;
  action_items_json?: string[] | null;
  risks_json?: string[] | null;
  follow_ups_json?: string[] | null;
  email_draft?: string | null;
  source_model?: string | null;
  generation_mode?: "openai_primary" | "fallback_local" | null;
  generation_status?: "full_success" | "degraded_success" | "failed" | null;
  fallback_reason?: string | null;
};

type SpeakerSegmentRecord = {
  speaker_label: string;
  start_ms: number;
  end_ms: number;
  text_snippet?: string | null;
  confidence?: number | null;
  metadata?: Record<string, unknown> | null;
};

type JobPayload = {
  jobId: string;
  meetingId?: string;
  userId?: string;
  artifactType?: string;
};

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getMeetingTranscriptBucket() {
  return readEnv("SUPABASE_MEETING_TRANSCRIPT_BUCKET") || "meeting-transcripts";
}

function getRawAssetRetentionHours() {
  const configured = Number(readEnv("RAW_ASSET_RETENTION_HOURS"));
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 7 * 24) : 24;
}

function getTranscriptRetentionMinutes() {
  const configured = Number(readEnv("TRANSCRIPT_RETENTION_MINUTES"));
  return Number.isFinite(configured) && configured > 0 ? Math.min(configured, 24 * 60) : 60;
}

function cloneRecord(value: Record<string, unknown> | null | undefined) {
  if (!value) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function normalizeTranscriptText(transcriptText: string) {
  return transcriptText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitTranscriptIntoSegments(transcriptText: string) {
  const sentences = transcriptText
    .replace(/\r/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.reduce<SpeakerSegmentRecord[]>((segments, sentence, index) => {
    const previous = segments[segments.length - 1];

    if (!previous || (previous.text_snippet ?? "").length > 180) {
      segments.push({
        speaker_label: `Speaker ${segments.length + 1}`,
        start_ms: index * 18000,
        end_ms: index * 18000 + 15000,
        text_snippet: sentence,
        confidence: 0.45,
        metadata: { inferred: true },
      });
      return segments;
    }

    previous.end_ms += 12000;
    previous.text_snippet = `${previous.text_snippet} ${sentence}`.trim();
    return segments;
  }, []);
}

function createSpeakerSegmentsFromParagraphs(
  paragraphs: DeepgramParagraph[],
  fallbackTranscript: string
) {
  if (paragraphs.length === 0) {
    return splitTranscriptIntoSegments(fallbackTranscript);
  }

  return paragraphs.map<SpeakerSegmentRecord>((paragraph, index) => ({
    speaker_label: paragraph.speakerLabel ?? `Speaker ${index + 1}`,
    start_ms: paragraph.startMs,
    end_ms: Math.max(paragraph.endMs, paragraph.startMs + 1000),
    text_snippet: paragraph.text,
    confidence: paragraph.confidence ?? 0.5,
    metadata: {
      inferred: paragraph.speakerLabel == null,
      source: "deepgram",
      paragraphIndex: paragraph.index,
    },
  }));
}

function getAssetExpiryIso(kind: MeetingAssetKind) {
  const now = Date.now();

  if (kind === "audio_raw") {
    return new Date(now + getRawAssetRetentionHours() * 60 * 60 * 1000).toISOString();
  }

  return new Date(now + getTranscriptRetentionMinutes() * 60 * 1000).toISOString();
}

function getMeetingStatusForFindingsGeneration(
  generationStatus: "full_success" | "degraded_success" | "failed"
): MeetingStatus {
  return generationStatus === "degraded_success" ? "partial_success" : "ready";
}

function capTranscriptBudget(transcriptText: string) {
  const trimmed = transcriptText.trim();
  if (trimmed.length <= 12000) {
    return trimmed;
  }

  const paragraphs = trimmed.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  let acc = "";

  for (const paragraph of paragraphs) {
    const candidate = acc ? `${acc}\n\n${paragraph}` : paragraph;
    if (candidate.length > 12000) {
      break;
    }
    acc = candidate;
  }

  return acc || trimmed.slice(0, 12000);
}

async function ensurePrivateBucket(bucket: string) {
  const admin = createAdminClient();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();

  if (listError) {
    throw listError;
  }

  const exists = (buckets ?? []).some((item) => item.name === bucket);

  if (!exists) {
    const { error: createError } = await admin.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: "50MB",
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw createError;
    }
  }
}

async function fetchJobById(jobId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("ai_jobs").select("*").eq("id", jobId).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AiJobRecord | null) ?? null;
}

class AiJobCanceledError extends Error {
  stage: string;

  constructor(stage: string, message: string) {
    super(message);
    this.name = "AiJobCanceledError";
    this.stage = stage;
  }
}

async function fetchQueuedAnalyzeJob(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_jobs")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .eq("job_type", "analyze")
    .in("status", ["queued", "cancel_requested"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AiJobRecord | null) ?? null;
}

function mergeProviderMetadata(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
) {
  return {
    ...(existing ?? {}),
    ...patch,
  };
}

async function refreshJob(jobId: string) {
  const nextJob = await fetchJobById(jobId);

  if (!nextJob) {
    throw new Error("AI job not found.");
  }

  return nextJob;
}

async function throwIfCancellationRequested(jobId: string, stage: string) {
  const job = await refreshJob(jobId);

  if (job.status === "canceled") {
    throw new AiJobCanceledError(stage, "Processing was canceled by the user.");
  }

  if (job.status === "cancel_requested" || job.cancel_requested_at) {
    throw new AiJobCanceledError(stage, "Cancellation requested. Stopping at the next safe checkpoint.");
  }

  return job;
}

async function fetchMeeting(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("web_meetings")
    .select("*")
    .eq("id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MeetingRecord | null) ?? null;
}

async function fetchLatestAudioAsset(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_assets")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .eq("asset_kind", "audio_raw")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MeetingAssetRecord | null) ?? null;
}

async function fetchLatestTranscriptAsset(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_assets")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .eq("asset_kind", "transcript_text")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MeetingAssetRecord | null) ?? null;
}

async function fetchFindings(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_findings")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MeetingFindingsRecord | null) ?? null;
}

async function fetchArtifacts(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_artifacts")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data as MeetingArtifactRecord[] | null) ?? [];
}

async function updateMeetingStatus(
  meeting: MeetingRecord,
  status: MeetingStatus,
  metadataPatch?: Record<string, unknown>
) {
  const admin = createAdminClient();
  const nextMetadata = {
    ...(meeting.session_metadata ?? {}),
    ...(metadataPatch ?? {}),
  };

  const { error } = await admin
    .from("web_meetings")
    .update({
      status,
      session_metadata: nextMetadata,
      ended_at:
        status === "finalizing_upload" ||
        status === "queued" ||
        status === "transcribing" ||
        status === "transcript_ready" ||
        status === "analyzing" ||
        status === "ready" ||
        status === "cancel_requested" ||
        status === "canceled" ||
        status === "failed" ||
        status === "partial_success"
          ? new Date().toISOString()
          : undefined,
    })
    .eq("id", meeting.id)
    .eq("user_id", meeting.user_id);

  if (error) {
    throw error;
  }

  meeting.status = status;
  meeting.session_metadata = nextMetadata;
}

async function updateAiJob(jobId: string, updates: Partial<AiJobRecord> & { stage?: AiJobStage }) {
  const admin = createAdminClient();
  const { error } = await admin.from("ai_jobs").update(updates).eq("id", jobId);

  if (error) {
    throw error;
  }
}

async function upsertMeetingAsset(args: {
  meetingId: string;
  userId: string;
  assetKind: MeetingAssetKind;
  bucket: string;
  path: string;
  mimeType?: string | null;
  byteSize?: number | null;
  checksum?: string | null;
  createdByJobId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("meeting_assets").upsert(
    {
      meeting_id: args.meetingId,
      user_id: args.userId,
      asset_kind: args.assetKind,
      bucket: args.bucket,
      path: args.path,
      mime_type: args.mimeType ?? null,
      byte_size: args.byteSize ?? null,
      checksum: args.checksum ?? null,
      status: "available",
      expires_at: getAssetExpiryIso(args.assetKind),
      created_by_job_id: args.createdByJobId ?? null,
      metadata: args.metadata ?? {},
    },
    {
      onConflict: "meeting_id,asset_kind,path",
    }
  );

  if (error) {
    throw error;
  }
}

async function uploadTranscriptAsset(args: {
  meetingId: string;
  userId: string;
  content: string;
  createdByJobId: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const bucket = getMeetingTranscriptBucket();
  const path = `${args.userId}/${args.meetingId}/transcript/latest-transcript.txt`;

  await ensurePrivateBucket(bucket);

  const { error: uploadError } = await admin.storage.from(bucket).upload(path, args.content, {
    contentType: "text/plain; charset=utf-8",
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  await upsertMeetingAsset({
    meetingId: args.meetingId,
    userId: args.userId,
    assetKind: "transcript_text",
    bucket,
    path,
    mimeType: "text/plain; charset=utf-8",
    byteSize: Buffer.byteLength(args.content, "utf8"),
    checksum: createHash("sha256").update(args.content).digest("hex"),
    createdByJobId: args.createdByJobId,
    metadata: args.metadata,
  });

  return { bucket, path };
}

async function replaceSpeakerSegments(args: {
  meetingId: string;
  userId: string;
  segments: SpeakerSegmentRecord[];
}) {
  const admin = createAdminClient();
  const { error: deleteError } = await admin
    .from("meeting_speaker_segments")
    .delete()
    .eq("meeting_id", args.meetingId)
    .eq("user_id", args.userId);

  if (deleteError) {
    throw deleteError;
  }

  if (args.segments.length === 0) {
    return;
  }

  const { error: insertError } = await admin.from("meeting_speaker_segments").insert(
    args.segments.map((segment) => ({
      meeting_id: args.meetingId,
      user_id: args.userId,
      speaker_label: segment.speaker_label,
      start_ms: segment.start_ms,
      end_ms: segment.end_ms,
      text_snippet: segment.text_snippet ?? null,
      confidence: segment.confidence ?? null,
      metadata: segment.metadata ?? {},
    }))
  );

  if (insertError) {
    throw insertError;
  }
}

async function upsertMeetingFindings(
  meetingId: string,
  userId: string,
  findings: Awaited<ReturnType<typeof generateMeetingFindings>>
) {
  const admin = createAdminClient();
  const { error } = await admin.from("meeting_findings").upsert(
    {
      meeting_id: meetingId,
      user_id: userId,
      status: "ready",
      summary_short: findings.summaryShort,
      summary_full: findings.summaryFull,
      executive_bullets_json: findings.executiveBullets,
      decisions_json: findings.decisions,
      action_items_json: findings.actionItems,
      risks_json: findings.risks,
      follow_ups_json: findings.followUps,
      email_draft: findings.emailDraft,
      source_model: findings.sourceModel,
      generation_mode: findings.generationMode,
      generation_status: findings.generationStatus,
      fallback_reason: findings.fallbackReason,
    },
    {
      onConflict: "meeting_id",
    }
  );

  if (error) {
    throw error;
  }
}

async function upsertMeetingArtifact(args: {
  meetingId: string;
  userId: string;
  artifactType: MeetingArtifactType;
  status: string;
  payloadJson?: Record<string, unknown> | null;
  payloadText?: string | null;
  sourceModel: string;
  createdByJobId: string;
  version?: number;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("meeting_artifacts")
    .select("version")
    .eq("meeting_id", args.meetingId)
    .eq("artifact_type", args.artifactType)
    .maybeSingle();

  const nextVersion = args.version ?? (((existing as { version?: number } | null)?.version ?? 0) + 1);

  const { error } = await admin.from("meeting_artifacts").upsert(
    {
      meeting_id: args.meetingId,
      user_id: args.userId,
      artifact_type: args.artifactType,
      status: args.status,
      payload_json: args.payloadJson ?? null,
      payload_text: args.payloadText ?? null,
      source_model: args.sourceModel,
      version: nextVersion,
      metadata: args.metadata ?? {},
      created_by_job_id: args.createdByJobId,
    },
    {
      onConflict: "meeting_id,artifact_type",
    }
  );

  if (error) {
    throw error;
  }
}

async function materializeArtifacts(args: {
  meeting: MeetingRecord;
  userId: string;
  findings: MeetingFindingsRecord;
  sourceModel: string;
  jobId: string;
  metadata?: Record<string, unknown>;
}) {
  const canonicalArtifact = buildCanonicalArtifact({
    meeting: args.meeting,
    findings: args.findings,
    sourceModel: args.sourceModel,
  });
  const markdown = canonicalArtifactToMarkdown(canonicalArtifact);

  await Promise.all([
    upsertMeetingArtifact({
      meetingId: args.meeting.id,
      userId: args.userId,
      artifactType: "canonical_json",
      status: "ready",
      payloadJson: canonicalArtifact as unknown as Record<string, unknown>,
      sourceModel: args.sourceModel,
      createdByJobId: args.jobId,
      metadata: { role: "canonical", ...(args.metadata ?? {}) },
    }),
    upsertMeetingArtifact({
      meetingId: args.meeting.id,
      userId: args.userId,
      artifactType: "canonical_markdown",
      status: "ready",
      payloadText: markdown,
      sourceModel: args.sourceModel,
      createdByJobId: args.jobId,
      metadata: { role: "canonical", ...(args.metadata ?? {}) },
    }),
    upsertMeetingArtifact({
      meetingId: args.meeting.id,
      userId: args.userId,
      artifactType: "summary",
      status: "ready",
      payloadJson: {
        summaryShort: args.findings.summary_short,
        summaryFull: args.findings.summary_full,
        executiveBullets: args.findings.executive_bullets_json ?? [],
      },
      payloadText: args.findings.summary_full ?? args.findings.summary_short ?? "",
      sourceModel: args.sourceModel,
      createdByJobId: args.jobId,
      metadata: args.metadata,
    }),
    upsertMeetingArtifact({
      meetingId: args.meeting.id,
      userId: args.userId,
      artifactType: "action_items",
      status: "ready",
      payloadJson: {
        actionItems: args.findings.action_items_json ?? [],
        decisions: args.findings.decisions_json ?? [],
        risks: args.findings.risks_json ?? [],
        followUps: args.findings.follow_ups_json ?? [],
      },
      payloadText: (args.findings.action_items_json ?? []).join("\n"),
      sourceModel: args.sourceModel,
      createdByJobId: args.jobId,
      metadata: args.metadata,
    }),
    upsertMeetingArtifact({
      meetingId: args.meeting.id,
      userId: args.userId,
      artifactType: "email_draft",
      status: "ready",
      payloadText: args.findings.email_draft ?? "",
      sourceModel: args.sourceModel,
      createdByJobId: args.jobId,
      metadata: args.metadata,
    }),
  ]);
}

async function readAssetAsFile(asset: MeetingAssetRecord) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(asset.bucket).download(asset.path);

  if (error) {
    throw error;
  }

  return new File([await data.arrayBuffer()], asset.path.split("/").pop() ?? "meeting-audio", {
    type: asset.mime_type ?? "audio/webm",
  });
}

async function readTranscriptText(asset: MeetingAssetRecord) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(asset.bucket).download(asset.path);

  if (error) {
    throw error;
  }

  return data.text();
}

async function createAnalyzeJob(args: {
  meetingId: string;
  userId: string;
  parentJobId: string;
  transcriptReadyAt: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_jobs")
    .insert({
      meeting_id: args.meetingId,
      user_id: args.userId,
      job_type: "analyze",
      status: "queued",
      stage: "queued",
      provider_metadata: {
        execution_mode: "railway_remote",
        transcriptReadyAt: args.transcriptReadyAt,
        parentJobId: args.parentJobId,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create analyze job.");
  }

  return data as AiJobRecord;
}

async function queueAnalyzeJob(job: AiJobRecord) {
  await getAiQueue().add(
    "analyze",
    {
      jobId: job.id,
      meetingId: job.meeting_id,
      userId: job.user_id,
    },
    {
      jobId: job.id,
      removeOnComplete: false,
      removeOnFail: false,
    }
  );
}

async function runTranscribe(job: AiJobRecord) {
  const meeting = await fetchMeeting(job.meeting_id, job.user_id);

  if (!meeting) {
    throw new Error("Meeting not found for AI job.");
  }

  await throwIfCancellationRequested(job.id, "before_transcription");

  const providerMetadata = cloneRecord(job.provider_metadata);
  providerMetadata.execution_mode = "railway_remote";
  providerMetadata.pipeline = {
    primaryTranscriptionProvider: "deepgram",
    downstreamFindingsProvider: process.env.OPENAI_API_KEY ? "openai" : "unconfigured",
    transcriptSource: "audio_asset",
    executionTarget: "railway_worker_direct",
  };

  const transcribeStartedAt = Date.now();

  await updateAiJob(job.id, {
    status: "running",
    stage: "transcribing",
    attempts: (job.attempts ?? 0) + 1,
    started_at: new Date().toISOString(),
    provider_metadata: providerMetadata,
  });
  await updateMeetingStatus(meeting, "transcribing");
  await throwIfCancellationRequested(job.id, "before_transcription_provider_call");

  let transcriptText =
    typeof providerMetadata.sourceText === "string" ? providerMetadata.sourceText.trim() : "";
  const rawAudioAsset = await fetchLatestAudioAsset(job.meeting_id, job.user_id);
  let deepgramResult: Awaited<ReturnType<typeof transcribeWithDeepgramResult>> | null = null;

  if (!transcriptText && rawAudioAsset) {
    const audioFile = await readAssetAsFile(rawAudioAsset);
    deepgramResult = await transcribeWithDeepgramResult(
      audioFile,
      rawAudioAsset.mime_type ?? undefined
    );
    transcriptText = deepgramResult.transcript;
  }

  transcriptText = normalizeTranscriptText(transcriptText);
  await throwIfCancellationRequested(job.id, "after_transcription_before_materialization");

  if (!transcriptText) {
    throw new Error("No transcript text was available to process.");
  }

  await updateAiJob(job.id, {
    status: "running",
    stage: "normalizing",
    provider_metadata: {
      ...providerMetadata,
      transcription: {
        status: "normalizing",
        provider: deepgramResult?.provider ?? "manual",
        sourceModel: deepgramResult?.sourceModel ?? "manual:seed-text",
      },
    },
  });
  await updateMeetingStatus(meeting, "processing");

  const speakerSegments = createSpeakerSegmentsFromParagraphs(
    deepgramResult?.paragraphs ?? [],
    transcriptText
  );
  const transcriptAsset = await uploadTranscriptAsset({
    meetingId: job.meeting_id,
    userId: job.user_id,
    content: transcriptText,
    createdByJobId: job.id,
    metadata: {
      provider: deepgramResult?.provider ?? "manual",
      sourceModel: deepgramResult?.sourceModel ?? "manual:seed-text",
      requestId: deepgramResult?.requestId ?? null,
      language: deepgramResult?.language ?? null,
      confidence: deepgramResult?.confidence ?? null,
      durationSeconds: deepgramResult?.durationSeconds ?? null,
      paragraphCount: deepgramResult?.paragraphs.length ?? speakerSegments.length,
      normalizedSegmentCount: speakerSegments.length,
      source: deepgramResult ? "deepgram_asr" : "source_text",
      ...cloneRecord(deepgramResult?.providerMetadata ?? null),
    },
  });

  await replaceSpeakerSegments({
    meetingId: job.meeting_id,
    userId: job.user_id,
    segments: speakerSegments,
  });
  await throwIfCancellationRequested(job.id, "after_transcript_before_preview");

  const previewFindings = fallbackFindings(meeting.title, transcriptText);
  await upsertMeetingFindings(job.meeting_id, job.user_id, previewFindings);

  await upsertMeetingArtifact({
    meetingId: meeting.id,
    userId: meeting.user_id,
    artifactType: "summary",
    status: "ready",
    payloadJson: {
      summaryShort: previewFindings.summaryShort,
      summaryFull: previewFindings.summaryFull,
      executiveBullets: previewFindings.executiveBullets,
    },
    payloadText: previewFindings.summaryFull,
    sourceModel: previewFindings.sourceModel,
    createdByJobId: job.id,
    metadata: { preview: true },
  });

  const transcriptReadyAt = new Date().toISOString();
  const transcribeMs = Date.now() - transcribeStartedAt;
  providerMetadata.transcription = {
    provider: deepgramResult?.provider ?? "manual",
    sourceModel: deepgramResult?.sourceModel ?? "manual:seed-text",
    requestId: deepgramResult?.requestId ?? null,
    language: deepgramResult?.language ?? null,
    confidence: deepgramResult?.confidence ?? null,
    durationSeconds: deepgramResult?.durationSeconds ?? null,
    status: "ready",
    transcriptStorage: "temporary_asset",
    transcriptBucket: transcriptAsset.bucket,
    transcriptPath: transcriptAsset.path,
    normalizedSegmentCount: speakerSegments.length,
  };
  providerMetadata.findings = {
    status: "preview_ready",
    sourceModel: previewFindings.sourceModel,
    preview: true,
  };
  providerMetadata.transcriptReadyAt = transcriptReadyAt;
  providerMetadata.timings = {
    ...(typeof providerMetadata.timings === "object" ? providerMetadata.timings : {}),
    transcribeMs,
  };

  await updateAiJob(job.id, {
    status: "ready",
    stage: "completed",
    finished_at: transcriptReadyAt,
    error: null,
    provider_metadata: providerMetadata,
  });
  await updateMeetingStatus(meeting, "transcript_ready", {
    transcript_ready_at: transcriptReadyAt,
  });
  await throwIfCancellationRequested(job.id, "after_transcript_ready_before_analyze_enqueue");

  try {
    const analyzeJob = await createAnalyzeJob({
      meetingId: job.meeting_id,
      userId: job.user_id,
      parentJobId: job.id,
      transcriptReadyAt,
    });
    const refreshedAnalyzeJob = await throwIfCancellationRequested(job.id, "before_analyze_enqueue");

    if (refreshedAnalyzeJob.status !== "canceled" && refreshedAnalyzeJob.status !== "cancel_requested") {
      await queueAnalyzeJob(analyzeJob);
    }
  } catch (error) {
    if (error instanceof AiJobCanceledError) {
      throw error;
    }
    console.error("[ai-core] Unable to enqueue analyze job after transcript completion", {
      aiJobId: job.id,
      meetingId: job.meeting_id,
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}

async function runAnalyze(job: AiJobRecord) {
  const meeting = await fetchMeeting(job.meeting_id, job.user_id);

  if (!meeting) {
    throw new Error("Meeting not found for analyze job.");
  }

  await throwIfCancellationRequested(job.id, "before_analyze");

  const transcriptAsset = await fetchLatestTranscriptAsset(job.meeting_id, job.user_id);

  if (!transcriptAsset) {
    throw new Error("Transcript asset not found for analyze job.");
  }

  const providerMetadata = cloneRecord(job.provider_metadata);
  providerMetadata.execution_mode = "railway_remote";
  const analyzeStartedAt = Date.now();

  await updateAiJob(job.id, {
    status: "running",
    stage: "extracting",
    attempts: (job.attempts ?? 0) + 1,
    started_at: new Date().toISOString(),
    provider_metadata: providerMetadata,
  });
  await updateMeetingStatus(meeting, "analyzing");
  await throwIfCancellationRequested(job.id, "before_findings_provider_call");

  const transcriptText = await readTranscriptText(transcriptAsset);
  const findingsPayload = await generateMeetingFindings(
    meeting.title,
    capTranscriptBudget(transcriptText)
  );
  await throwIfCancellationRequested(job.id, "after_findings_before_persist");

  await upsertMeetingFindings(job.meeting_id, job.user_id, findingsPayload);

  const findingsRecord: MeetingFindingsRecord = {
    meeting_id: meeting.id,
    user_id: meeting.user_id,
    status: "ready",
    summary_short: findingsPayload.summaryShort,
    summary_full: findingsPayload.summaryFull,
    executive_bullets_json: findingsPayload.executiveBullets,
    decisions_json: findingsPayload.decisions,
    action_items_json: findingsPayload.actionItems,
    risks_json: findingsPayload.risks,
    follow_ups_json: findingsPayload.followUps,
    email_draft: findingsPayload.emailDraft,
    source_model: findingsPayload.sourceModel,
    generation_mode: findingsPayload.generationMode,
    generation_status: findingsPayload.generationStatus,
    fallback_reason: findingsPayload.fallbackReason,
  };

  if (findingsPayload.generationStatus === "degraded_success") {
    markWorkerDegraded(
      findingsPayload.fallbackReason ?? "Findings generation completed in fallback mode.",
      "analyze",
      job.id
    );
  }

  await updateAiJob(job.id, {
    status: "running",
    stage: "assembling",
    provider_metadata: {
      ...providerMetadata,
      findings: {
        status: findingsPayload.generationStatus,
        sourceModel: findingsPayload.sourceModel,
        generationMode: findingsPayload.generationMode,
        fallbackReason: findingsPayload.fallbackReason,
      },
    },
  });

  await materializeArtifacts({
    meeting,
    userId: job.user_id,
    findings: findingsRecord,
    sourceModel: findingsPayload.sourceModel,
    jobId: job.id,
  });

  const findingsReadyAt = new Date().toISOString();
  const timings = {
    ...(typeof providerMetadata.timings === "object" ? providerMetadata.timings : {}),
    analyzeMs: Date.now() - analyzeStartedAt,
  };

  await updateAiJob(job.id, {
    status: "ready",
    stage: "completed",
    finished_at: findingsReadyAt,
    error: null,
    provider_metadata: {
      ...providerMetadata,
      findings: {
        status: findingsPayload.generationStatus,
        sourceModel: findingsPayload.sourceModel,
        generatedAt: findingsReadyAt,
        generationMode: findingsPayload.generationMode,
        fallbackReason: findingsPayload.fallbackReason,
      },
      findingsReadyAt,
      timings,
    },
  });
  await updateMeetingStatus(meeting, getMeetingStatusForFindingsGeneration(findingsPayload.generationStatus), {
    findings_ready_at: findingsReadyAt,
    findings_generation_mode: findingsPayload.generationMode,
    findings_generation_status: findingsPayload.generationStatus,
    findings_fallback_reason: findingsPayload.fallbackReason,
  });
}

async function runRegenerate(job: AiJobRecord) {
  const meeting = await fetchMeeting(job.meeting_id, job.user_id);

  if (!meeting || !job.artifact_type) {
    throw new Error("Meeting or artifact type not found for regeneration.");
  }

  await throwIfCancellationRequested(job.id, "before_regenerate");

  const [findings, artifacts] = await Promise.all([
    fetchFindings(job.meeting_id, job.user_id),
    fetchArtifacts(job.meeting_id, job.user_id),
  ]);
  const canonical = parseCanonicalArtifact(
    artifacts.find((artifact) => artifact.artifact_type === "canonical_json")
  );
  const seedContent = deriveStructuredMeetingContent({
    meeting,
    findings,
    artifacts,
  });

  await updateAiJob(job.id, {
    status: "running",
    stage: "regenerating",
    attempts: (job.attempts ?? 0) + 1,
    started_at: new Date().toISOString(),
    provider_metadata: {
      ...(job.provider_metadata ?? {}),
      execution_mode: "railway_remote",
    },
  });
  await throwIfCancellationRequested(job.id, "before_regeneration_provider_call");

  const regenerated = await generateMeetingFindings(meeting.title, seedContent.markdown);
  await throwIfCancellationRequested(job.id, "after_regeneration_before_persist");
  const nextSourceModel = regenerated.sourceModel;
  const nextFindings: MeetingFindingsRecord = {
    meeting_id: meeting.id,
    user_id: job.user_id,
    status: "ready",
    summary_short:
      job.artifact_type === "summary"
        ? regenerated.summaryShort
        : findings?.summary_short ?? regenerated.summaryShort,
    summary_full:
      job.artifact_type === "summary"
        ? regenerated.summaryFull
        : findings?.summary_full ?? regenerated.summaryFull,
    executive_bullets_json:
      job.artifact_type === "summary"
        ? regenerated.executiveBullets
        : findings?.executive_bullets_json ?? regenerated.executiveBullets,
    decisions_json: findings?.decisions_json ?? regenerated.decisions,
    action_items_json:
      job.artifact_type === "action_items"
        ? regenerated.actionItems
        : findings?.action_items_json ?? regenerated.actionItems,
    risks_json:
      job.artifact_type === "action_items"
        ? regenerated.risks
        : findings?.risks_json ?? regenerated.risks,
    follow_ups_json:
      job.artifact_type === "action_items"
        ? regenerated.followUps
        : findings?.follow_ups_json ?? regenerated.followUps,
    email_draft:
      job.artifact_type === "email_draft"
        ? regenerated.emailDraft
        : findings?.email_draft ?? regenerated.emailDraft,
    source_model: nextSourceModel,
    generation_mode: regenerated.generationMode,
    generation_status: regenerated.generationStatus,
    fallback_reason: regenerated.fallbackReason,
  };

  if (regenerated.generationStatus === "degraded_success") {
    markWorkerDegraded(
      regenerated.fallbackReason ?? "Artifact regeneration completed in fallback mode.",
      "regenerate",
      job.id
    );
  }

  await upsertMeetingFindings(job.meeting_id, job.user_id, {
    summaryShort: nextFindings.summary_short ?? regenerated.summaryShort,
    summaryFull: nextFindings.summary_full ?? regenerated.summaryFull,
    executiveBullets: nextFindings.executive_bullets_json ?? regenerated.executiveBullets,
    decisions: nextFindings.decisions_json ?? regenerated.decisions,
    actionItems: nextFindings.action_items_json ?? regenerated.actionItems,
    risks: nextFindings.risks_json ?? regenerated.risks,
    followUps: nextFindings.follow_ups_json ?? regenerated.followUps,
    emailDraft: nextFindings.email_draft ?? regenerated.emailDraft,
    sourceModel: nextSourceModel,
    generationMode: regenerated.generationMode,
    generationStatus: regenerated.generationStatus,
    fallbackReason: regenerated.fallbackReason,
  });

  if (job.artifact_type === "summary") {
    await upsertMeetingArtifact({
      meetingId: meeting.id,
      userId: job.user_id,
      artifactType: "summary",
      status: "ready",
      payloadJson: {
        summaryShort: nextFindings.summary_short,
        summaryFull: nextFindings.summary_full,
        executiveBullets: nextFindings.executive_bullets_json ?? [],
      },
      payloadText: nextFindings.summary_full ?? "",
      sourceModel: nextSourceModel,
      createdByJobId: job.id,
      metadata: { regenerated: true },
    });
  }

  if (job.artifact_type === "action_items") {
    await upsertMeetingArtifact({
      meetingId: meeting.id,
      userId: job.user_id,
      artifactType: "action_items",
      status: "ready",
      payloadJson: {
        actionItems: nextFindings.action_items_json ?? [],
        decisions: nextFindings.decisions_json ?? [],
        risks: nextFindings.risks_json ?? [],
        followUps: nextFindings.follow_ups_json ?? [],
      },
      payloadText: (nextFindings.action_items_json ?? []).join("\n"),
      sourceModel: nextSourceModel,
      createdByJobId: job.id,
      metadata: { regenerated: true },
    });
  }

  if (job.artifact_type === "email_draft") {
    await upsertMeetingArtifact({
      meetingId: meeting.id,
      userId: job.user_id,
      artifactType: "email_draft",
      status: "ready",
      payloadText: nextFindings.email_draft ?? "",
      sourceModel: nextSourceModel,
      createdByJobId: job.id,
      metadata: { regenerated: true },
    });
  }

  if (canonical) {
    const nextCanonical = {
      ...canonical,
      generatedAt: new Date().toISOString(),
      sourceModel: nextSourceModel,
      summaryShort: nextFindings.summary_short ?? canonical.summaryShort,
      summaryFull: nextFindings.summary_full ?? canonical.summaryFull,
      executiveBullets: nextFindings.executive_bullets_json ?? canonical.executiveBullets,
      decisions: nextFindings.decisions_json ?? canonical.decisions,
      actionItems: nextFindings.action_items_json ?? canonical.actionItems,
      risks: nextFindings.risks_json ?? canonical.risks,
      followUps: nextFindings.follow_ups_json ?? canonical.followUps,
      emailDraft: nextFindings.email_draft ?? canonical.emailDraft,
    };

    await Promise.all([
      upsertMeetingArtifact({
        meetingId: meeting.id,
        userId: job.user_id,
        artifactType: "canonical_json",
        status: "ready",
        payloadJson: nextCanonical as unknown as Record<string, unknown>,
        sourceModel: nextSourceModel,
        createdByJobId: job.id,
        metadata: { regenerated: true },
      }),
      upsertMeetingArtifact({
        meetingId: meeting.id,
        userId: job.user_id,
        artifactType: "canonical_markdown",
        status: "ready",
        payloadText: canonicalArtifactToMarkdown(nextCanonical),
        sourceModel: nextSourceModel,
        createdByJobId: job.id,
        metadata: { regenerated: true },
      }),
    ]);
  }

  await updateAiJob(job.id, {
    status: "ready",
    stage: "completed",
    finished_at: new Date().toISOString(),
    error: null,
    provider_metadata: {
      ...(job.provider_metadata ?? {}),
      regeneratedArtifact: job.artifact_type,
      sourceModel: nextSourceModel,
      execution_mode: "railway_remote",
      findings: {
        status: regenerated.generationStatus,
        generationMode: regenerated.generationMode,
        fallbackReason: regenerated.fallbackReason,
      },
    },
  });

  await updateMeetingStatus(meeting, getMeetingStatusForFindingsGeneration(regenerated.generationStatus), {
    findings_generation_mode: regenerated.generationMode,
    findings_generation_status: regenerated.generationStatus,
    findings_fallback_reason: regenerated.fallbackReason,
  });
}

async function markJobCanceled(job: AiJobRecord, canceledStage: string, error: AiJobCanceledError) {
  const meeting = await fetchMeeting(job.meeting_id, job.user_id);
  const now = new Date().toISOString();
  const providerMetadata = cloneRecord(job.provider_metadata);

  await updateAiJob(job.id, {
    status: "canceled",
    stage: "canceled",
    error: null,
    cancel_requested_at: job.cancel_requested_at ?? now,
    canceled_at: now,
    finished_at: now,
    provider_metadata: {
      ...providerMetadata,
      cancel: {
        requestedAt: job.cancel_requested_at ?? now,
        canceledAt: now,
        effectiveStage: canceledStage,
        effectiveMode: "checkpoint",
        reason: job.cancel_reason ?? error.message,
      },
    },
  });

  if (job.job_type === "transcribe") {
    const pendingAnalyzeJob = await fetchQueuedAnalyzeJob(job.meeting_id, job.user_id);

    if (pendingAnalyzeJob) {
      await updateAiJob(pendingAnalyzeJob.id, {
        status: "canceled",
        stage: "canceled",
        finished_at: now,
        cancel_requested_at: pendingAnalyzeJob.cancel_requested_at ?? now,
        canceled_at: now,
        cancel_reason: job.cancel_reason ?? error.message,
        provider_metadata: mergeProviderMetadata(pendingAnalyzeJob.provider_metadata, {
          cancel: {
            requestedAt: pendingAnalyzeJob.cancel_requested_at ?? now,
            canceledAt: now,
            effectiveStage: "queued_after_transcript",
            effectiveMode: "immediate",
            reason: job.cancel_reason ?? error.message,
          },
        }),
      });
    }
  }

  if (meeting) {
    await updateMeetingStatus(meeting, "canceled", {
      cancel_requested_at: meeting.cancel_requested_at ?? job.cancel_requested_at ?? now,
      canceled_at: now,
      cancel_reason: job.cancel_reason ?? error.message,
      cancel_effective_stage: canceledStage,
      capture_state: "canceled",
    });
  }
}

async function markJobFailed(job: AiJobRecord, failedStage: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : "AI processing failed.";
  markWorkerDegraded(errorMessage, failedStage, job.id);
  await updateAiJob(job.id, {
    status: "failed",
    stage: "completed",
    error: errorMessage,
    finished_at: new Date().toISOString(),
    provider_metadata: {
      ...(job.provider_metadata ?? {}),
      execution_mode: "railway_remote",
      failed_stage: failedStage,
      findings:
        failedStage === "analyze" || failedStage === "regenerate"
          ? {
              status: "failed",
              generationMode: "openai_primary",
              fallbackReason: errorMessage,
            }
          : (job.provider_metadata ?? {}).findings,
    },
  });
}

export async function executeQueuedJob(jobName: string, payload: JobPayload) {
  const job = await fetchJobById(payload.jobId);

  if (!job) {
    throw new Error("AI job not found.");
  }

  const startedAt = Date.now();

  return runWithTraceSpan(
    `ai_job.${jobName}`,
    {
      service: "nextstop-ai-worker",
      job_name: jobName,
      job_id: job.id,
      meeting_id: job.meeting_id,
      user_id: job.user_id,
      capture_session_id: null,
    },
    async () => {
      try {
        if (jobName === "transcribe") {
          await runTranscribe(job);
          recordAiJobOutcome({ jobName, outcome: "success", startedAt });
          return;
        }

        if (jobName === "analyze") {
          await runAnalyze(job);
          recordAiJobOutcome({ jobName, outcome: "success", startedAt });
          return;
        }

        if (jobName === "regenerate") {
          await runRegenerate(job);
          recordAiJobOutcome({ jobName, outcome: "success", startedAt });
          return;
        }

        throw new Error(`Unsupported AI job type: ${jobName}`);
      } catch (error) {
        if (error instanceof AiJobCanceledError) {
          await markJobCanceled(job, error.stage, error);
          recordAiJobOutcome({ jobName, outcome: "canceled", startedAt });
          logEvent("warn", "ai_job_canceled", {
            service: "nextstop-ai-worker",
            jobName,
            jobId: job.id,
            meetingId: job.meeting_id,
            stage: error.stage,
            message: error.message,
          });
          return;
        }

        const failedStage =
          jobName === "transcribe"
            ? "transcribe"
            : jobName === "analyze"
              ? "analyze"
              : "regenerate";
        await markJobFailed(job, failedStage, error);
        recordAiJobOutcome({ jobName, outcome: "failed", startedAt });
        captureException(error, {
          service: "nextstop-ai-worker",
          jobName,
          jobId: job.id,
          meetingId: job.meeting_id,
          userId: job.user_id,
          stage: failedStage,
        });

        if (jobName === "transcribe" || jobName === "analyze" || jobName === "regenerate") {
          const meeting = await fetchMeeting(job.meeting_id, job.user_id);
          if (meeting) {
            await updateMeetingStatus(meeting, "failed", {
              latest_ai_error: error instanceof Error ? error.message : "AI processing failed.",
              findings_generation_status: jobName !== "transcribe" ? "failed" : undefined,
              findings_fallback_reason:
                jobName !== "transcribe"
                  ? error instanceof Error
                    ? error.message
                    : "AI processing failed."
                  : undefined,
            });
          }
        }

        throw error;
      }
    }
  );
}
