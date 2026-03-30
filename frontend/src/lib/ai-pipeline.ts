import "server-only";

import { createHash } from "node:crypto";

import {
  buildCanonicalArtifact,
  canonicalArtifactToMarkdown,
  deriveStructuredMeetingContent,
  parseCanonicalArtifact,
} from "@/lib/meeting-artifacts";
import {
  getAiCoreApiUrl,
  getAiCoreSharedSecret,
  getAiInlineFallbackAllowed,
  getAiPipelineMode,
  getMeetingAudioBucket,
  getMeetingTranscriptBucket,
  getRawAssetRetentionHours,
  getTranscriptRetentionMinutes,
  isTranscriptDownloadEnabled,
} from "@/lib/env";
import {
  type DeepgramParagraph,
  type DeepgramTranscriptionResult,
  transcribeWithDeepgramResult,
} from "@/lib/deepgram";
import { createAdminClient } from "@/lib/supabase-admin";
import { generateMeetingFindings } from "@/lib/workspace-ai";
import type {
  AiJobRecord,
  AiJobStage,
  AiStatusSnapshot,
  MeetingArtifactRecord,
  MeetingArtifactType,
  MeetingAssetKind,
  MeetingAssetRecord,
  MeetingFindingsRecord,
  SpeakerSegmentRecord,
  TranscriptAvailability,
  WebMeetingRecord,
} from "@/lib/workspace";

type QueueMeetingProcessingArgs = {
  meetingId: string;
  userId: string;
  audioAsset?: {
    bucket: string;
    path: string;
    mimeType?: string | null;
    byteSize?: number | null;
    checksum?: string | null;
  } | null;
  sourceText?: string;
};

type QueueArtifactRegenerationArgs = {
  meetingId: string;
  userId: string;
  artifactType: MeetingArtifactType;
};

const ensuredBuckets = new Set<string>();

type TranscriptMaterializationResult = {
  transcriptText: string;
  transcriptAsset: {
    bucket: string;
    path: string;
  };
  speakerSegments: SpeakerSegmentRecord[];
  transcription: {
    provider: string;
    sourceModel: string;
    requestId: string | null;
    language: string | null;
    confidence: number | null;
    durationSeconds: number | null;
    providerMetadata: Record<string, unknown>;
  };
};

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function makeAssetPath(
  userId: string,
  meetingId: string,
  kind: MeetingAssetKind,
  filename: string
) {
  return `${userId}/${meetingId}/${kind}/${Date.now()}-${sanitizeFilename(filename)}`;
}

async function ensurePrivateBucket(bucket: string) {
  if (ensuredBuckets.has(bucket)) {
    return;
  }

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

  ensuredBuckets.add(bucket);
}

function splitTranscriptIntoSegments(transcriptText: string) {
  const sentences = transcriptText
    .replace(/\r/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.reduce<SpeakerSegmentRecord[]>((segments, sentence, index) => {
    const previous = segments[segments.length - 1];

    if (!previous || previous.text_snippet!.length > 180) {
      segments.push({
        id: `segment-${index}`,
        meeting_id: "",
        user_id: "",
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

function createSpeakerSegmentsFromParagraphs(
  paragraphs: DeepgramParagraph[],
  fallbackTranscript: string
) {
  if (paragraphs.length === 0) {
    return splitTranscriptIntoSegments(fallbackTranscript);
  }

  return paragraphs.map<SpeakerSegmentRecord>((paragraph, index) => ({
    id: `segment-${index}`,
    meeting_id: "",
    user_id: "",
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

async function updateMeetingStatus(
  meetingId: string,
  userId: string,
  status: WebMeetingRecord["status"]
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("web_meetings")
    .update({
      status,
      ended_at:
        status === "queued" ||
        status === "transcribing" ||
        status === "analyzing" ||
        status === "ready" ||
        status === "failed" ||
        status === "partial_success"
          ? new Date().toISOString()
          : undefined,
    })
    .eq("id", meetingId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

async function updateAiJob(
  jobId: string,
  updates: Partial<AiJobRecord> & { stage?: AiJobStage }
) {
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

async function uploadTextAsset(args: {
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

  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, args.content, {
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

  return (data as WebMeetingRecord | null) ?? null;
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

async function fetchLatestJob(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_jobs")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AiJobRecord | null) ?? null;
}

async function fetchJobById(jobId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("ai_jobs").select("*").eq("id", jobId).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AiJobRecord | null) ?? null;
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

async function readAudioAssetAsFile(asset: MeetingAssetRecord) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(asset.bucket).download(asset.path);

  if (error) {
    throw error;
  }

  return new File([await data.arrayBuffer()], asset.path.split("/").pop() ?? "meeting-audio", {
    type: asset.mime_type ?? "audio/webm",
  });
}

async function readTextAssetByLocation(bucket: string, path: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(path);

  if (error) {
    throw error;
  }

  return data.text();
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

  const nextVersion =
    args.version ??
    (((existing as { version?: number } | null)?.version ?? 0) + 1);

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

async function materializeTranscript(args: {
  meetingId: string;
  userId: string;
  jobId: string;
  transcriptText: string;
  deepgramResult?: DeepgramTranscriptionResult | null;
}) {
  const transcriptText = normalizeTranscriptText(args.transcriptText);

  if (!transcriptText) {
    throw new Error("Transcript text is empty.");
  }

  const speakerSegments = createSpeakerSegmentsFromParagraphs(
    args.deepgramResult?.paragraphs ?? [],
    transcriptText
  ).map((segment) => ({
    ...segment,
    meeting_id: args.meetingId,
    user_id: args.userId,
  }));

  const transcriptAsset = await uploadTextAsset({
    meetingId: args.meetingId,
    userId: args.userId,
    content: transcriptText,
    createdByJobId: args.jobId,
    metadata: {
      provider: args.deepgramResult?.provider ?? "manual",
      sourceModel: args.deepgramResult?.sourceModel ?? "manual:seed-text",
      requestId: args.deepgramResult?.requestId ?? null,
      language: args.deepgramResult?.language ?? null,
      confidence: args.deepgramResult?.confidence ?? null,
      durationSeconds: args.deepgramResult?.durationSeconds ?? null,
      paragraphCount: args.deepgramResult?.paragraphs.length ?? speakerSegments.length,
      normalizedSegmentCount: speakerSegments.length,
      source: args.deepgramResult ? "deepgram_asr" : "source_text",
      ...cloneRecord(args.deepgramResult?.providerMetadata ?? null),
    },
  });

  await replaceSpeakerSegments({
    meetingId: args.meetingId,
    userId: args.userId,
    segments: speakerSegments,
  });

  return {
    transcriptText,
    transcriptAsset,
    speakerSegments,
    transcription: {
      provider: args.deepgramResult?.provider ?? "manual",
      sourceModel: args.deepgramResult?.sourceModel ?? "manual:seed-text",
      requestId: args.deepgramResult?.requestId ?? null,
      language: args.deepgramResult?.language ?? null,
      confidence: args.deepgramResult?.confidence ?? null,
      durationSeconds: args.deepgramResult?.durationSeconds ?? null,
      providerMetadata: cloneRecord(args.deepgramResult?.providerMetadata ?? null),
    },
  } satisfies TranscriptMaterializationResult;
}

async function materializeArtifacts(args: {
  meeting: WebMeetingRecord;
  userId: string;
  findings: MeetingFindingsRecord;
  sourceModel: string;
  jobId: string;
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
      metadata: { role: "canonical" },
    }),
    upsertMeetingArtifact({
      meetingId: args.meeting.id,
      userId: args.userId,
      artifactType: "canonical_markdown",
      status: "ready",
      payloadText: markdown,
      sourceModel: args.sourceModel,
      createdByJobId: args.jobId,
      metadata: { role: "canonical" },
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
    }),
    upsertMeetingArtifact({
      meetingId: args.meeting.id,
      userId: args.userId,
      artifactType: "email_draft",
      status: "ready",
      payloadText: args.findings.email_draft ?? "",
      sourceModel: args.sourceModel,
      createdByJobId: args.jobId,
    }),
  ]);
}

async function runTranscriptionJob(
  job: AiJobRecord,
  executionMode: "inline_legacy" | "railway_remote"
) {
  const meeting = await fetchMeeting(job.meeting_id, job.user_id);

  if (!meeting) {
    throw new Error("Meeting not found for AI job.");
  }

  const providerMetadata = cloneRecord(job.provider_metadata);
  providerMetadata.execution_mode = executionMode;
  providerMetadata.pipeline = {
    primaryTranscriptionProvider: "deepgram",
    downstreamFindingsProvider: process.env.OPENAI_API_KEY ? "openai" : "unconfigured",
    transcriptSource: "audio_asset",
  };

  await updateAiJob(job.id, {
    status: "running",
    stage: "transcribing",
    attempts: (job.attempts ?? 0) + 1,
    started_at: new Date().toISOString(),
    provider_metadata: providerMetadata,
  });
  await updateMeetingStatus(job.meeting_id, job.user_id, "transcribing");

  let transcriptText =
    typeof providerMetadata.sourceText === "string" ? providerMetadata.sourceText.trim() : "";
  const rawAudioAsset = await fetchLatestAudioAsset(job.meeting_id, job.user_id);
  let deepgramResult: DeepgramTranscriptionResult | null = null;

  if (!transcriptText && rawAudioAsset) {
    const audioFile = await readAudioAssetAsFile(rawAudioAsset);
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
        requestId: deepgramResult?.requestId ?? null,
        language: deepgramResult?.language ?? null,
        confidence: deepgramResult?.confidence ?? null,
        durationSeconds: deepgramResult?.durationSeconds ?? null,
      },
    },
  });
  await updateMeetingStatus(job.meeting_id, job.user_id, "processing");

  const transcriptResult = await materializeTranscript({
    meetingId: job.meeting_id,
    userId: job.user_id,
    jobId: job.id,
    transcriptText,
    deepgramResult,
  });

  providerMetadata.transcription = {
    provider: transcriptResult.transcription.provider,
    sourceModel: transcriptResult.transcription.sourceModel,
    requestId: transcriptResult.transcription.requestId,
    language: transcriptResult.transcription.language,
    confidence: transcriptResult.transcription.confidence,
    durationSeconds: transcriptResult.transcription.durationSeconds,
    status: "ready",
    transcriptStorage: "temporary_asset",
    transcriptBucket: transcriptResult.transcriptAsset.bucket,
    transcriptPath: transcriptResult.transcriptAsset.path,
    normalizedSegmentCount: transcriptResult.speakerSegments.length,
  };
  providerMetadata.findings = {
    status: "queued",
    transcriptSource: "transcript_asset",
  };

  await updateAiJob(job.id, {
    status: "running",
    stage: "extracting",
    provider_metadata: providerMetadata,
  });
  await updateMeetingStatus(job.meeting_id, job.user_id, "analyzing");

  const findingsPayload = await generateMeetingFindings(
    meeting.title,
    transcriptResult.transcriptText
  );
  const findingsRecord: MeetingFindingsRecord = {
    id: `findings-${job.id}`,
    meeting_id: meeting.id,
    user_id: job.user_id,
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

  await upsertMeetingFindings(job.meeting_id, job.user_id, findingsPayload);
  providerMetadata.findings = {
    status: "ready",
    transcriptSource: "transcript_asset",
    sourceModel: findingsPayload.sourceModel,
    generatedAt: new Date().toISOString(),
  };

  await updateAiJob(job.id, {
    status: "running",
    stage: "assembling",
    provider_metadata: providerMetadata,
  });

  await materializeArtifacts({
    meeting,
    userId: job.user_id,
    findings: findingsRecord,
    sourceModel: findingsPayload.sourceModel,
    jobId: job.id,
  });

  await updateAiJob(job.id, {
    status: "ready",
    stage: "completed",
    finished_at: new Date().toISOString(),
    error: null,
    provider_metadata: {
      ...providerMetadata,
      transcriptAvailable: true,
      sourceModel: findingsPayload.sourceModel,
    },
  });
  await updateMeetingStatus(job.meeting_id, job.user_id, "ready");
}

async function runRegenerationJob(
  job: AiJobRecord,
  executionMode: "inline_legacy" | "railway_remote"
) {
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
      execution_mode: executionMode,
    },
  });

  const regenerated = await generateMeetingFindings(meeting.title, seedContent.markdown);
  const nextSourceModel = regenerated.sourceModel;
  const nextFindings: MeetingFindingsRecord = {
    id: findings?.id ?? `findings-${job.id}`,
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
      executiveBullets:
        nextFindings.executive_bullets_json ?? canonical.executiveBullets,
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
      execution_mode: executionMode,
    },
  });
}

async function queueRemoteJob(
  path: "/jobs/transcribe" | "/jobs/finalize" | "/jobs/regenerate",
  body: Record<string, unknown>
) {
  const apiUrl = getAiCoreApiUrl();
  const secret = getAiCoreSharedSecret();

  if (!apiUrl || !secret) {
    throw new Error("AI core is not configured.");
  }

  console.info("[workspace-ai] Dispatching remote AI job", {
    path,
    apiUrl,
    jobId: body.jobId,
  });
  const response = await fetch(new URL(path, apiUrl).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `AI core request failed with ${response.status}.`);
  }
}

async function markRemoteDispatchFailure(args: {
  job: AiJobRecord;
  error: unknown;
  failedStage: "queue_remote" | "regenerate_remote";
}) {
  const errorMessage =
    args.error instanceof Error ? args.error.message : "Remote worker handoff failed.";
  const providerMetadata = cloneRecord(args.job.provider_metadata);
  const remoteDispatch = cloneRecord(
    providerMetadata.remote_dispatch as Record<string, unknown> | undefined
  );

  remoteDispatch.failedAt = new Date().toISOString();
  remoteDispatch.error = errorMessage;
  providerMetadata.execution_mode = "railway_remote";
  providerMetadata.remote_dispatch = remoteDispatch;

  await updateAiJob(args.job.id, {
    status: "failed",
    stage: "completed",
    error: errorMessage,
    finished_at: new Date().toISOString(),
    provider_metadata: {
      ...providerMetadata,
      failed_stage: args.failedStage,
    },
  });
}

export async function executeTranscriptionJob(
  jobId: string,
  executionMode: "inline_legacy" | "railway_remote"
) {
  const job = await fetchJobById(jobId);

  if (!job || job.job_type !== "transcribe") {
    throw new Error("Transcription job not found.");
  }

  try {
    await runTranscriptionJob(job, executionMode);
  } catch (error) {
    await updateAiJob(job.id, {
      status: "failed",
      stage: "completed",
      error: error instanceof Error ? error.message : "AI processing failed.",
      finished_at: new Date().toISOString(),
      provider_metadata: {
        ...(job.provider_metadata ?? {}),
        execution_mode: executionMode,
        failed_stage: "transcribe",
      },
    });
    await updateMeetingStatus(job.meeting_id, job.user_id, "failed");
    throw error;
  }
}

export async function executeRegenerationJob(
  jobId: string,
  executionMode: "inline_legacy" | "railway_remote"
) {
  const job = await fetchJobById(jobId);

  if (!job || job.job_type !== "regenerate_artifact") {
    throw new Error("Regeneration job not found.");
  }

  try {
    await runRegenerationJob(job, executionMode);
  } catch (error) {
    await updateAiJob(job.id, {
      status: "failed",
      stage: "completed",
      error: error instanceof Error ? error.message : "Artifact regeneration failed.",
      finished_at: new Date().toISOString(),
      provider_metadata: {
        ...(job.provider_metadata ?? {}),
        execution_mode: executionMode,
        failed_stage: "regenerate",
      },
    });
    throw error;
  }
}

export async function createMeetingAudioUploadTarget(args: {
  meetingId: string;
  userId: string;
  filename: string;
}) {
  const bucket = getMeetingAudioBucket();
  const path = makeAssetPath(args.userId, args.meetingId, "audio_raw", args.filename);
  const admin = createAdminClient();

  await ensurePrivateBucket(bucket);

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data?.token) {
    throw error ?? new Error("Unable to create a signed upload URL.");
  }

  return {
    bucket,
    path,
    token: data.token,
  };
}

export async function uploadAudioAssetThroughServer(args: {
  meetingId: string;
  userId: string;
  file: File;
  mimeType?: string | null;
  checksum?: string | null;
}) {
  const admin = createAdminClient();
  const bucket = getMeetingAudioBucket();
  const filename = args.file.name || "meeting-capture.webm";
  const path = makeAssetPath(args.userId, args.meetingId, "audio_raw", filename);

  await ensurePrivateBucket(bucket);

  const { error } = await admin.storage
    .from(bucket)
    .upload(path, Buffer.from(await args.file.arrayBuffer()), {
      contentType: args.mimeType || args.file.type || "audio/webm",
      upsert: true,
    });

  if (error) {
    throw error;
  }

  return {
    bucket,
    path,
    mimeType: args.mimeType || args.file.type || "audio/webm",
    byteSize: args.file.size,
    checksum: args.checksum ?? null,
  };
}

export async function queueMeetingProcessing(args: QueueMeetingProcessingArgs) {
  const meeting = await fetchMeeting(args.meetingId, args.userId);

  if (!meeting) {
    throw new Error("Meeting not found.");
  }

  const admin = createAdminClient();
  const providerMetadata: Record<string, unknown> = {};

  if (args.sourceText?.trim()) {
    providerMetadata.sourceText = args.sourceText.trim();
  }

  providerMetadata.pipeline = {
    primaryTranscriptionProvider: "deepgram",
    downstreamFindingsProvider: process.env.OPENAI_API_KEY ? "openai" : "unconfigured",
  };

  const { data: insertedJob, error: jobError } = await admin
    .from("ai_jobs")
    .insert({
      meeting_id: args.meetingId,
      user_id: args.userId,
      job_type: "transcribe",
      status: "queued",
      stage: args.audioAsset ? "uploaded" : "queued",
      provider_metadata: providerMetadata,
    })
    .select("*")
    .single();

  if (jobError || !insertedJob) {
    throw jobError ?? new Error("Unable to create the AI job.");
  }

  const job = insertedJob as AiJobRecord;

  if (args.audioAsset) {
    await upsertMeetingAsset({
      meetingId: args.meetingId,
      userId: args.userId,
      assetKind: "audio_raw",
      bucket: args.audioAsset.bucket,
      path: args.audioAsset.path,
      mimeType: args.audioAsset.mimeType ?? null,
      byteSize: args.audioAsset.byteSize ?? null,
      checksum: args.audioAsset.checksum ?? null,
      createdByJobId: job.id,
    });
  }

  await updateMeetingStatus(args.meetingId, args.userId, "queued");

  if (getAiPipelineMode() === "railway_remote") {
    try {
      await updateAiJob(job.id, {
        provider_metadata: {
          ...providerMetadata,
          execution_mode: "railway_remote",
          remote_dispatch: {
            queuedAt: new Date().toISOString(),
          },
        },
      });
      await queueRemoteJob("/jobs/transcribe", {
        jobId: job.id,
        meetingId: args.meetingId,
        userId: args.userId,
      });

      return {
        jobId: job.id,
        meetingStatus: "queued" as const,
        mode: "railway_remote" as const,
      };
    } catch (error) {
      const fallbackAllowed = getAiInlineFallbackAllowed();

      console.warn(
        fallbackAllowed
          ? "[workspace] Remote AI queue failed, falling back inline."
          : "[workspace] Remote AI queue failed without inline fallback.",
        error
      );

      if (!fallbackAllowed) {
        await markRemoteDispatchFailure({
          job,
          error,
          failedStage: "queue_remote",
        });
        await updateMeetingStatus(args.meetingId, args.userId, "failed");
        throw error;
      }
    }
  }

  await executeTranscriptionJob(job.id, "inline_legacy");

  return {
    jobId: job.id,
    meetingStatus: "ready" as const,
    mode: "inline_legacy" as const,
  };
}

export async function queueArtifactRegeneration(args: QueueArtifactRegenerationArgs) {
  const meeting = await fetchMeeting(args.meetingId, args.userId);

  if (!meeting) {
    throw new Error("Meeting not found.");
  }

  const admin = createAdminClient();
  const { data: insertedJob, error } = await admin
    .from("ai_jobs")
    .insert({
      meeting_id: args.meetingId,
      user_id: args.userId,
      job_type: "regenerate_artifact",
      artifact_type: args.artifactType,
      status: "queued",
      stage: "queued",
      provider_metadata: {
        regenerate: true,
      },
    })
    .select("*")
    .single();

  if (error || !insertedJob) {
    throw error ?? new Error("Unable to create the regeneration job.");
  }

  const job = insertedJob as AiJobRecord;

  if (getAiPipelineMode() === "railway_remote") {
    try {
      await updateAiJob(job.id, {
        provider_metadata: {
          ...(job.provider_metadata ?? {}),
          execution_mode: "railway_remote",
          remote_dispatch: {
            queuedAt: new Date().toISOString(),
          },
        },
      });
      await queueRemoteJob("/jobs/regenerate", {
        jobId: job.id,
        meetingId: args.meetingId,
        userId: args.userId,
        artifactType: args.artifactType,
      });

      return {
        jobId: job.id,
        meetingStatus: meeting.status,
        mode: "railway_remote" as const,
      };
    } catch (caughtError) {
      const fallbackAllowed = getAiInlineFallbackAllowed();

      console.warn(
        fallbackAllowed
          ? "[workspace] Remote regenerate failed, falling back inline."
          : "[workspace] Remote regenerate failed without inline fallback.",
        caughtError
      );

      if (!fallbackAllowed) {
        await markRemoteDispatchFailure({
          job,
          error: caughtError,
          failedStage: "regenerate_remote",
        });
        throw caughtError;
      }
    }
  }

  await executeRegenerationJob(job.id, "inline_legacy");

  return {
    jobId: job.id,
    meetingStatus: meeting.status,
    mode: "inline_legacy" as const,
  };
}

export async function loadAiStatusSnapshot(meetingId: string, userId: string) {
  const meeting = await fetchMeeting(meetingId, userId);

  if (!meeting) {
    return null;
  }

  const [latestJob, artifacts, transcriptAsset, rawAudioAsset] = await Promise.all([
    fetchLatestJob(meetingId, userId),
    fetchArtifacts(meetingId, userId),
    fetchLatestTranscriptAsset(meetingId, userId),
    fetchLatestAudioAsset(meetingId, userId),
  ]);

  const pendingStatuses: WebMeetingRecord["status"][] = [
    "queued",
    "transcribing",
    "analyzing",
    "processing",
  ];

  return {
    meetingId,
    meetingStatus: meeting.status,
    latestJob,
    artifacts,
    transcriptAsset,
    rawAudioAsset,
    pending: pendingStatuses.includes(meeting.status),
  } satisfies AiStatusSnapshot;
}

export function getTranscriptAvailabilityFromAsset(
  transcriptAsset: MeetingAssetRecord | null,
  meeting?: WebMeetingRecord | null
): TranscriptAvailability {
  if (meeting?.origin_platform === "desktop" && meeting?.transcript_storage === "local_only") {
    return {
      status: "local_only",
      downloadEnabled: false,
      message: "Transcript is available only on the desktop app for this meeting.",
      expiresAt: null,
    };
  }

  if (!isTranscriptDownloadEnabled()) {
    return {
      status: "disabled",
      downloadEnabled: false,
      message:
        "Transcript downloads are disabled for this production launch. Findings remain available.",
      expiresAt: null,
    };
  }

  if (!transcriptAsset?.expires_at) {
    return {
      status: "disabled",
      downloadEnabled: false,
      message:
        "This meeting keeps only the structured findings bundle. No transcript is stored in the shared workspace.",
      expiresAt: null,
    };
  }

  if (new Date(transcriptAsset.expires_at).getTime() <= Date.now()) {
    return {
      status: "expired",
      downloadEnabled: false,
      message:
        "The temporary transcript is no longer available. Findings remain permanently available.",
      expiresAt: transcriptAsset.expires_at,
    };
  }

  return {
    status: "available",
    downloadEnabled: true,
    message: "Transcript is available temporarily from private storage.",
    expiresAt: transcriptAsset.expires_at,
  };
}

export async function downloadTranscriptForMeeting(args: {
  meetingId: string;
  userId: string;
}) {
  const [meeting, transcriptAsset] = await Promise.all([
    fetchMeeting(args.meetingId, args.userId),
    fetchLatestTranscriptAsset(args.meetingId, args.userId),
  ]);

  if (!meeting) {
    throw new Error("Meeting not found.");
  }

  const availability = getTranscriptAvailabilityFromAsset(transcriptAsset, meeting);

  if (!availability.downloadEnabled || !transcriptAsset) {
    return {
      meeting,
      transcript: null,
      availability,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(transcriptAsset.bucket)
    .download(transcriptAsset.path);

  if (error) {
    throw error;
  }

  return {
    meeting,
    transcript: await data.text(),
    availability,
  };
}

export function getMeetingStructuredContent(args: {
  meeting: WebMeetingRecord;
  findings: MeetingFindingsRecord | null;
  artifacts: MeetingArtifactRecord[];
}) {
  return deriveStructuredMeetingContent(args);
}
