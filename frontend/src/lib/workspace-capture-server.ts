import "server-only";

import { createHash } from "node:crypto";

import {
  getAiCoreApiUrl,
  getAiCoreSharedSecret,
  getAiPipelineMode,
  getMeetingAudioBucket,
} from "@/lib/env";
import { queueMeetingProcessing } from "@/lib/ai-pipeline";
import { createAdminClient } from "@/lib/supabase-admin";

type CaptureSessionStatus =
  | "preparing"
  | "recording"
  | "ending"
  | "sealed"
  | "materializing_audio"
  | "queued_for_transcription"
  | "cancel_requested"
  | "canceled"
  | "failed";

type CaptureChunkStatus = "pending" | "received" | "failed";

type WebMeetingRecord = {
  id: string;
  user_id: string;
  title: string;
  status: string;
  source_type: string;
  session_metadata?: Record<string, unknown> | null;
  current_capture_session_id?: string | null;
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
};

type MeetingCaptureSessionRecord = {
  id: string;
  meeting_id: string;
  user_id: string;
  status: CaptureSessionStatus;
  capture_mode: string;
  source_surface?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  sealed_at?: string | null;
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
  last_client_heartbeat_at?: string | null;
  last_chunk_received_at?: string | null;
  total_chunks_received?: number | null;
  total_bytes_received?: number | null;
  final_asset_bucket?: string | null;
  final_asset_path?: string | null;
  final_asset_status?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
};

type MeetingCaptureChunkRecord = {
  id: string;
  capture_session_id: string;
  meeting_id: string;
  user_id: string;
  chunk_index: number;
  bucket: string;
  path: string;
  byte_size?: number | null;
  checksum?: string | null;
  received_at?: string | null;
  status: CaptureChunkStatus;
  metadata?: Record<string, unknown> | null;
};

type AiJobRecord = {
  id: string;
  meeting_id: string;
  user_id: string;
  job_type: string;
  status: string;
  stage: string;
  provider_metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

const ensuredBuckets = new Set<string>();

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function cloneRecord(value: Record<string, unknown> | null | undefined) {
  if (!value) {
    return {};
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
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
      fileSizeLimit: "200MB",
    });

    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw createError;
    }
  }

  ensuredBuckets.add(bucket);
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

async function fetchCaptureSession(captureSessionId: string, meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_capture_sessions")
    .select("*")
    .eq("id", captureSessionId)
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MeetingCaptureSessionRecord | null) ?? null;
}

async function fetchLatestCaptureSession(meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_capture_sessions")
    .select("*")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MeetingCaptureSessionRecord | null) ?? null;
}

async function fetchCaptureChunk(args: {
  captureSessionId: string;
  meetingId: string;
  userId: string;
  chunkIndex: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_capture_chunks")
    .select("*")
    .eq("capture_session_id", args.captureSessionId)
    .eq("meeting_id", args.meetingId)
    .eq("user_id", args.userId)
    .eq("chunk_index", args.chunkIndex)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MeetingCaptureChunkRecord | null) ?? null;
}

async function fetchCaptureChunks(captureSessionId: string, meetingId: string, userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_capture_chunks")
    .select("*")
    .eq("capture_session_id", captureSessionId)
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as MeetingCaptureChunkRecord[] | null) ?? [];
}

async function fetchLatestMeetingJob(meetingId: string, userId: string) {
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

async function updateMeeting(args: {
  meetingId: string;
  userId: string;
  status?: string;
  sessionMetadata?: Record<string, unknown>;
  currentCaptureSessionId?: string | null;
  cancelRequestedAt?: string | null;
  canceledAt?: string | null;
}) {
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (args.status !== undefined) {
    updates.status = args.status;
  }

  if (args.sessionMetadata !== undefined) {
    updates.session_metadata = args.sessionMetadata;
  }

  if (args.currentCaptureSessionId !== undefined) {
    updates.current_capture_session_id = args.currentCaptureSessionId;
  }

  if (args.cancelRequestedAt !== undefined) {
    updates.cancel_requested_at = args.cancelRequestedAt;
  }

  if (args.canceledAt !== undefined) {
    updates.canceled_at = args.canceledAt;
  }

  const { error } = await admin
    .from("web_meetings")
    .update(updates)
    .eq("id", args.meetingId)
    .eq("user_id", args.userId);

  if (error) {
    throw error;
  }
}

async function updateCaptureSession(args: {
  captureSessionId: string;
  meetingId: string;
  userId: string;
  updates: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("meeting_capture_sessions")
    .update(args.updates)
    .eq("id", args.captureSessionId)
    .eq("meeting_id", args.meetingId)
    .eq("user_id", args.userId);

  if (error) {
    throw error;
  }
}

async function updateAiJob(args: { jobId: string; updates: Record<string, unknown> }) {
  const admin = createAdminClient();
  const { error } = await admin.from("ai_jobs").update(args.updates).eq("id", args.jobId);

  if (error) {
    throw error;
  }
}

function makeChunkPath(args: {
  userId: string;
  meetingId: string;
  captureSessionId: string;
  chunkIndex: number;
  filename: string;
}) {
  return `${args.userId}/${args.meetingId}/capture-chunks/${args.captureSessionId}/${String(
    args.chunkIndex
  ).padStart(6, "0")}-${sanitizeFilename(args.filename)}`;
}

function makeFinalAssetPath(args: { userId: string; meetingId: string; captureSessionId: string }) {
  return `${args.userId}/${args.meetingId}/audio_raw/${args.captureSessionId}-finalized-capture.webm`;
}

function buildSessionMetadataPatch(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
) {
  return {
    ...cloneRecord(existing),
    ...patch,
  };
}

function buildJobProviderMetadataPatch(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
) {
  return {
    ...cloneRecord(existing),
    ...patch,
  };
}

function getChunkMimeType(chunk: MeetingCaptureChunkRecord | undefined) {
  const metadata = chunk?.metadata;
  return typeof metadata?.mimeType === "string" && metadata.mimeType.trim()
    ? metadata.mimeType
    : "audio/webm";
}

async function requestRemoteJobCancel(jobId: string) {
  const apiUrl = getAiCoreApiUrl();
  const secret = getAiCoreSharedSecret();

  if (!apiUrl || !secret) {
    return { removed: false };
  }

  const response = await fetch(new URL("/jobs/cancel", apiUrl).toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ jobId }),
    cache: "no-store",
  });

  if (!response.ok) {
    return { removed: false };
  }

  const payload = (await response.json().catch(() => null)) as { removed?: boolean } | null;
  return { removed: payload?.removed === true };
}

export async function createMeetingCaptureSession(args: {
  meetingId: string;
  userId: string;
  captureMode?: string;
  sourceSurface?: string | null;
}) {
  const meeting = await fetchMeeting(args.meetingId, args.userId);

  if (!meeting) {
    throw new Error("Meeting not found.");
  }

  const existingSessionId =
    typeof meeting.current_capture_session_id === "string"
      ? meeting.current_capture_session_id
      : null;

  if (existingSessionId) {
    const existingSession = await fetchCaptureSession(existingSessionId, args.meetingId, args.userId);

    if (
      existingSession &&
      ["preparing", "recording", "ending", "sealed", "materializing_audio"].includes(
        existingSession.status
      )
    ) {
      return existingSession;
    }
  }

  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("meeting_capture_sessions")
    .insert({
      meeting_id: args.meetingId,
      user_id: args.userId,
      status: "recording",
      capture_mode: args.captureMode ?? meeting.source_type ?? "browser_tab",
      source_surface: args.sourceSurface ?? null,
      started_at: startedAt,
      last_client_heartbeat_at: startedAt,
      metadata: {
        origin: "workspace_capture_island",
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create capture session.");
  }

  await updateMeeting({
    meetingId: args.meetingId,
    userId: args.userId,
    status: "capturing",
    currentCaptureSessionId: data.id,
    sessionMetadata: buildSessionMetadataPatch(meeting.session_metadata, {
      capture_state: "recording",
      capture_session_id: data.id,
      capture_started_at: startedAt,
    }),
  });

  return data as MeetingCaptureSessionRecord;
}

export async function createCaptureChunkUploadTarget(args: {
  meetingId: string;
  userId: string;
  captureSessionId: string;
  chunkIndex: number;
  filename: string;
  mimeType?: string | null;
}) {
  const [meeting, captureSession] = await Promise.all([
    fetchMeeting(args.meetingId, args.userId),
    fetchCaptureSession(args.captureSessionId, args.meetingId, args.userId),
  ]);

  if (!meeting || !captureSession) {
    throw new Error("Capture session not found.");
  }

  if (["cancel_requested", "canceled", "failed"].includes(captureSession.status)) {
    throw new Error("Capture session is no longer accepting uploads.");
  }

  if (["sealed", "materializing_audio", "queued_for_transcription"].includes(captureSession.status)) {
    throw new Error("Capture session has already been sealed.");
  }

  const bucket = getMeetingAudioBucket();
  const path = makeChunkPath({
    userId: args.userId,
    meetingId: args.meetingId,
    captureSessionId: args.captureSessionId,
    chunkIndex: args.chunkIndex,
    filename: args.filename,
  });
  const admin = createAdminClient();

  await ensurePrivateBucket(bucket);

  const existingChunk = await fetchCaptureChunk({
    captureSessionId: args.captureSessionId,
    meetingId: args.meetingId,
    userId: args.userId,
    chunkIndex: args.chunkIndex,
  });

  if (!existingChunk) {
    const { error: chunkInsertError } = await admin.from("meeting_capture_chunks").insert({
      capture_session_id: args.captureSessionId,
      meeting_id: args.meetingId,
      user_id: args.userId,
      chunk_index: args.chunkIndex,
      bucket,
      path,
      status: "pending",
      metadata: {
        mimeType: args.mimeType ?? null,
      },
    });

    if (chunkInsertError) {
      throw chunkInsertError;
    }
  }

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data?.token) {
    throw error ?? new Error("Unable to create a signed upload URL.");
  }

  return {
    bucket,
    path,
    token: data.token,
    chunkIndex: args.chunkIndex,
    captureSessionId: args.captureSessionId,
  };
}

export async function completeCaptureChunkUpload(args: {
  meetingId: string;
  userId: string;
  captureSessionId: string;
  chunkIndex: number;
  byteSize?: number | null;
  checksum?: string | null;
}) {
  const [meeting, captureSession, chunk] = await Promise.all([
    fetchMeeting(args.meetingId, args.userId),
    fetchCaptureSession(args.captureSessionId, args.meetingId, args.userId),
    fetchCaptureChunk({
      captureSessionId: args.captureSessionId,
      meetingId: args.meetingId,
      userId: args.userId,
      chunkIndex: args.chunkIndex,
    }),
  ]);

  if (!meeting || !captureSession || !chunk) {
    throw new Error("Capture chunk not found.");
  }

  const now = new Date().toISOString();
  const alreadyReceived = chunk.status === "received";

  await createAdminClient()
    .from("meeting_capture_chunks")
    .update({
      status: "received",
      received_at: chunk.received_at ?? now,
      byte_size: chunk.byte_size ?? args.byteSize ?? null,
      checksum: chunk.checksum ?? args.checksum ?? null,
    })
    .eq("id", chunk.id);

  if (!alreadyReceived) {
    await updateCaptureSession({
      captureSessionId: args.captureSessionId,
      meetingId: args.meetingId,
      userId: args.userId,
      updates: {
        status: captureSession.status === "preparing" ? "recording" : captureSession.status,
        last_client_heartbeat_at: now,
        last_chunk_received_at: now,
        total_chunks_received: (captureSession.total_chunks_received ?? 0) + 1,
        total_bytes_received: (captureSession.total_bytes_received ?? 0) + (args.byteSize ?? 0),
      },
    });
  } else {
    await updateCaptureSession({
      captureSessionId: args.captureSessionId,
      meetingId: args.meetingId,
      userId: args.userId,
      updates: {
        last_client_heartbeat_at: now,
      },
    });
  }

  await updateMeeting({
    meetingId: args.meetingId,
    userId: args.userId,
    sessionMetadata: buildSessionMetadataPatch(meeting.session_metadata, {
      capture_state: "recording",
      last_chunk_received_at: now,
    }),
  });

  return {
    ok: true,
    chunkIndex: args.chunkIndex,
    captureSessionId: args.captureSessionId,
  };
}

export async function heartbeatCaptureSession(args: {
  meetingId: string;
  userId: string;
  captureSessionId: string;
}) {
  const captureSession = await fetchCaptureSession(args.captureSessionId, args.meetingId, args.userId);

  if (!captureSession) {
    throw new Error("Capture session not found.");
  }

  if (["canceled", "failed", "queued_for_transcription"].includes(captureSession.status)) {
    return {
      ok: true,
      status: captureSession.status,
    };
  }

  const now = new Date().toISOString();
  await updateCaptureSession({
    captureSessionId: args.captureSessionId,
    meetingId: args.meetingId,
    userId: args.userId,
    updates: {
      last_client_heartbeat_at: now,
      status: captureSession.status === "preparing" ? "recording" : captureSession.status,
    },
  });

  return {
    ok: true,
    status: captureSession.status,
  };
}

async function materializeFinalCaptureAsset(args: {
  meetingId: string;
  userId: string;
  captureSession: MeetingCaptureSessionRecord;
}) {
  if (args.captureSession.final_asset_bucket && args.captureSession.final_asset_path) {
    return {
      bucket: args.captureSession.final_asset_bucket,
      path: args.captureSession.final_asset_path,
      mimeType: "audio/webm",
      byteSize: args.captureSession.total_bytes_received ?? null,
      checksum: null,
    };
  }

  const chunks = await fetchCaptureChunks(args.captureSession.id, args.meetingId, args.userId);
  const receivedChunks = chunks.filter((chunk) => chunk.status === "received");

  if (receivedChunks.length === 0) {
    throw new Error("No uploaded capture chunks were available to finalize.");
  }

  await updateCaptureSession({
    captureSessionId: args.captureSession.id,
    meetingId: args.meetingId,
    userId: args.userId,
    updates: {
      status: "materializing_audio",
      final_asset_status: "materializing",
    },
  });

  const admin = createAdminClient();
  const buffers: Buffer[] = [];

  for (const chunk of receivedChunks) {
    const { data, error } = await admin.storage.from(chunk.bucket).download(chunk.path);

    if (error) {
      throw error;
    }

    buffers.push(Buffer.from(await data.arrayBuffer()));
  }

  const buffer = Buffer.concat(buffers);
  const bucket = getMeetingAudioBucket();
  const path = makeFinalAssetPath({
    userId: args.userId,
    meetingId: args.meetingId,
    captureSessionId: args.captureSession.id,
  });

  await ensurePrivateBucket(bucket);

  const { error: uploadError } = await admin.storage.from(bucket).upload(path, buffer, {
    contentType: getChunkMimeType(receivedChunks[0]),
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const checksum = createHash("sha256").update(buffer).digest("hex");
  await updateCaptureSession({
    captureSessionId: args.captureSession.id,
    meetingId: args.meetingId,
    userId: args.userId,
    updates: {
      final_asset_bucket: bucket,
      final_asset_path: path,
      final_asset_status: "ready",
      status: "sealed",
      error: null,
    },
  });

  return {
    bucket,
    path,
    mimeType: getChunkMimeType(receivedChunks[0]),
    byteSize: buffer.byteLength,
    checksum,
  };
}

export async function finalizeMeetingCaptureSession(args: {
  meetingId: string;
  userId: string;
  captureSessionId: string;
}) {
  const [meeting, captureSession, latestJob] = await Promise.all([
    fetchMeeting(args.meetingId, args.userId),
    fetchCaptureSession(args.captureSessionId, args.meetingId, args.userId),
    fetchLatestMeetingJob(args.meetingId, args.userId),
  ]);

  if (!meeting || !captureSession) {
    throw new Error("Capture session not found.");
  }

  if (captureSession.status === "canceled" || meeting.status === "canceled") {
    return {
      meetingId: args.meetingId,
      captureSessionId: args.captureSessionId,
      meetingStatus: "canceled" as const,
      jobId: latestJob?.id ?? null,
      accepted: false,
    };
  }

  if (
    latestJob &&
    ["queued", "running", "ready", "partial_success", "cancel_requested"].includes(latestJob.status)
  ) {
    return {
      meetingId: args.meetingId,
      captureSessionId: args.captureSessionId,
      meetingStatus: meeting.status,
      jobId: latestJob.id,
      accepted: true,
    };
  }

  const now = new Date().toISOString();
  await updateCaptureSession({
    captureSessionId: args.captureSessionId,
    meetingId: args.meetingId,
    userId: args.userId,
    updates: {
      status: "ending",
      ended_at: captureSession.ended_at ?? now,
      sealed_at: captureSession.sealed_at ?? now,
      error: null,
    },
  });

  await updateMeeting({
    meetingId: args.meetingId,
    userId: args.userId,
    status: "finalizing_upload",
    sessionMetadata: buildSessionMetadataPatch(meeting.session_metadata, {
      capture_state: "finalizing_upload",
      capture_session_id: args.captureSessionId,
      finalize_requested_at: now,
    }),
  });

  try {
    const finalAsset = await materializeFinalCaptureAsset({
      meetingId: args.meetingId,
      userId: args.userId,
      captureSession,
    });

    const pipeline = await queueMeetingProcessing({
      meetingId: args.meetingId,
      userId: args.userId,
      audioAsset: finalAsset,
    });

    await updateCaptureSession({
      captureSessionId: args.captureSessionId,
      meetingId: args.meetingId,
      userId: args.userId,
      updates: {
        status: "queued_for_transcription",
        final_asset_status: "queued_for_transcription",
        error: null,
      },
    });

    const refreshedMeeting = await fetchMeeting(args.meetingId, args.userId);
    await updateMeeting({
      meetingId: args.meetingId,
      userId: args.userId,
      sessionMetadata: buildSessionMetadataPatch(refreshedMeeting?.session_metadata, {
        capture_state: "queued_for_transcription",
        capture_session_id: args.captureSessionId,
      }),
    });

    return {
      meetingId: args.meetingId,
      captureSessionId: args.captureSessionId,
      meetingStatus: pipeline.meetingStatus,
      jobId: pipeline.jobId,
      accepted: true,
      mode: pipeline.mode,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to finalize the capture session.";

    await updateCaptureSession({
      captureSessionId: args.captureSessionId,
      meetingId: args.meetingId,
      userId: args.userId,
      updates: {
        status: "failed",
        error: message,
        final_asset_status: "failed",
      },
    }).catch(() => undefined);

    await updateMeeting({
      meetingId: args.meetingId,
      userId: args.userId,
      status: "failed",
      sessionMetadata: buildSessionMetadataPatch(meeting.session_metadata, {
        capture_state: "failed",
        capture_session_id: args.captureSessionId,
      }),
    }).catch(() => undefined);

    throw error;
  }
}

export async function cancelMeetingProcessing(args: {
  meetingId: string;
  userId: string;
  reason?: string | null;
}) {
  const [meeting, latestJob, captureSession] = await Promise.all([
    fetchMeeting(args.meetingId, args.userId),
    fetchLatestMeetingJob(args.meetingId, args.userId),
    fetchLatestCaptureSession(args.meetingId, args.userId),
  ]);

  if (!meeting) {
    throw new Error("Meeting not found.");
  }

  if (!["finalizing_upload", "queued", "transcribing", "transcript_ready", "analyzing"].includes(meeting.status)) {
    throw new Error("This meeting can no longer be canceled.");
  }

  const now = new Date().toISOString();
  const cancelReason = args.reason?.trim() || "Canceled by the user.";

  if (
    !latestJob ||
    latestJob.status === "queued" ||
    (meeting.status === "finalizing_upload" && latestJob.status !== "running")
  ) {
    const removed =
      latestJob && getAiPipelineMode() === "railway_remote"
        ? (await requestRemoteJobCancel(latestJob.id)).removed
        : false;

    if (latestJob) {
      await updateAiJob({
        jobId: latestJob.id,
        updates: {
          status: removed || latestJob.status === "queued" ? "canceled" : "cancel_requested",
          stage: removed || latestJob.status === "queued" ? "canceled" : latestJob.stage,
          cancel_requested_at: now,
          canceled_at: removed || latestJob.status === "queued" ? now : null,
          cancel_reason: cancelReason,
          cancel_requested_by: args.userId,
          provider_metadata: {
            ...buildJobProviderMetadataPatch(latestJob.provider_metadata, {
              cancel: {
                requestedAt: now,
                reason: cancelReason,
                effectiveMode:
                  removed || latestJob.status === "queued" ? "immediate" : "checkpoint",
              },
            }),
          },
          finished_at: removed || latestJob.status === "queued" ? now : null,
        },
      });
    }

    if (captureSession) {
      await updateCaptureSession({
        captureSessionId: captureSession.id,
        meetingId: args.meetingId,
        userId: args.userId,
        updates: {
          status: removed || !latestJob ? "canceled" : "cancel_requested",
          cancel_requested_at: now,
          canceled_at: removed || !latestJob ? now : null,
          error: null,
        },
      });
    }

    const nextStatus = removed || !latestJob ? "canceled" : "cancel_requested";
    await updateMeeting({
      meetingId: args.meetingId,
      userId: args.userId,
      status: nextStatus,
      cancelRequestedAt: now,
      canceledAt: nextStatus === "canceled" ? now : null,
      sessionMetadata: buildSessionMetadataPatch(meeting.session_metadata, {
        capture_state: nextStatus,
        cancel_reason: cancelReason,
        cancel_effective_stage: latestJob?.stage ?? meeting.status,
      }),
    });

    return {
      meetingId: args.meetingId,
      meetingStatus: nextStatus,
      cancelState: nextStatus,
      effectiveMode: nextStatus === "canceled" ? "immediate" : "checkpoint",
    };
  }

  await updateAiJob({
    jobId: latestJob.id,
    updates: {
      status: "cancel_requested",
      cancel_requested_at: now,
      cancel_reason: cancelReason,
      cancel_requested_by: args.userId,
      provider_metadata: {
        ...buildJobProviderMetadataPatch(latestJob.provider_metadata, {
          cancel: {
            requestedAt: now,
            reason: cancelReason,
            effectiveMode: "checkpoint",
          },
        }),
      },
    },
  });

  if (captureSession) {
    await updateCaptureSession({
      captureSessionId: captureSession.id,
      meetingId: args.meetingId,
      userId: args.userId,
      updates: {
        status: "cancel_requested",
        cancel_requested_at: now,
      },
    });
  }

  await updateMeeting({
    meetingId: args.meetingId,
    userId: args.userId,
    status: "cancel_requested",
    cancelRequestedAt: now,
    sessionMetadata: buildSessionMetadataPatch(meeting.session_metadata, {
      capture_state: "cancel_requested",
      cancel_reason: cancelReason,
      cancel_effective_stage: latestJob.stage,
    }),
  });

  return {
    meetingId: args.meetingId,
    meetingStatus: "cancel_requested" as const,
    cancelState: "cancel_requested" as const,
    effectiveMode: "checkpoint" as const,
  };
}
