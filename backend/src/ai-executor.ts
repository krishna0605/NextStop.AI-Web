import { createHash } from "node:crypto";

import {
  buildCanonicalArtifact,
  canonicalArtifactToMarkdown,
  deriveStructuredMeetingContent,
  parseCanonicalArtifact,
} from "./meeting-artifacts.js";
import { getAiQueue } from "./queue.js";
import { createAdminClient } from "./supabase.js";
import { transcribeWithDeepgramResult, type DeepgramParagraph } from "./deepgram.js";
import { fallbackFindings, generateMeetingFindings } from "./workspace-ai.js";

type MeetingStatus =
  | "queued"
  | "transcribing"
  | "transcript_ready"
  | "analyzing"
  | "processing"
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
  | "transcribing"
  | "normalizing"
  | "extracting"
  | "assembling"
  | "regenerating"
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
        status === "queued" ||
        status === "transcribing" ||
        status === "transcript_ready" ||
        status === "analyzing" ||
        status === "ready" ||
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

  try {
    const analyzeJob = await createAnalyzeJob({
      meetingId: job.meeting_id,
      userId: job.user_id,
      parentJobId: job.id,
      transcriptReadyAt,
    });
    await queueAnalyzeJob(analyzeJob);
  } catch (error) {
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

  const transcriptText = await readTranscriptText(transcriptAsset);
  const findingsPayload = await generateMeetingFindings(
    meeting.title,
    capTranscriptBudget(transcriptText)
  );

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
  };

  await updateAiJob(job.id, {
    status: "running",
    stage: "assembling",
    provider_metadata: {
      ...providerMetadata,
      findings: {
        status: "assembling",
        sourceModel: findingsPayload.sourceModel,
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
        status: "ready",
        sourceModel: findingsPayload.sourceModel,
        generatedAt: findingsReadyAt,
      },
      findingsReadyAt,
      timings,
    },
  });
  await updateMeetingStatus(meeting, "ready", {
    findings_ready_at: findingsReadyAt,
  });
}

async function runRegenerate(job: AiJobRecord) {
  const meeting = await fetchMeeting(job.meeting_id, job.user_id);

  if (!meeting || !job.artifact_type) {
    throw new Error("Meeting or artifact type not found for regeneration.");
  }

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

  const regenerated = await generateMeetingFindings(meeting.title, seedContent.markdown);
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
  };

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
    },
  });
}

async function markJobFailed(job: AiJobRecord, failedStage: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : "AI processing failed.";
  await updateAiJob(job.id, {
    status: "failed",
    stage: "completed",
    error: errorMessage,
    finished_at: new Date().toISOString(),
    provider_metadata: {
      ...(job.provider_metadata ?? {}),
      execution_mode: "railway_remote",
      failed_stage: failedStage,
    },
  });
}

export async function executeQueuedJob(jobName: string, payload: JobPayload) {
  const job = await fetchJobById(payload.jobId);

  if (!job) {
    throw new Error("AI job not found.");
  }

  try {
    if (jobName === "transcribe") {
      await runTranscribe(job);
      return;
    }

    if (jobName === "analyze") {
      await runAnalyze(job);
      return;
    }

    if (jobName === "regenerate") {
      await runRegenerate(job);
      return;
    }

    throw new Error(`Unsupported AI job type: ${jobName}`);
  } catch (error) {
    const failedStage =
      jobName === "transcribe" ? "transcribe" : jobName === "analyze" ? "analyze" : "regenerate";
    await markJobFailed(job, failedStage, error);

    if (jobName === "transcribe" || jobName === "analyze") {
      const meeting = await fetchMeeting(job.meeting_id, job.user_id);
      if (meeting) {
        await updateMeetingStatus(meeting, "failed", {
          latest_ai_error: error instanceof Error ? error.message : "AI processing failed.",
        });
      }
    }

    throw error;
  }
}
