import "server-only";

import {
  getTranscriptRetentionMinutes,
  getTranscriptStorageMode,
  isTranscriptDownloadEnabled,
} from "@/lib/env";

type EphemeralTranscriptRecord = {
  meetingId: string;
  transcript: string;
  createdAt: number;
  expiresAt: number;
};

declare global {
  var __nextstopTranscriptStore: Map<string, EphemeralTranscriptRecord> | undefined;
}

function getStore() {
  if (!globalThis.__nextstopTranscriptStore) {
    globalThis.__nextstopTranscriptStore = new Map();
  }

  return globalThis.__nextstopTranscriptStore;
}

export function rememberEphemeralTranscript(meetingId: string, transcript: string) {
  const now = Date.now();
  const expiresAt = now + getTranscriptRetentionMinutes() * 60 * 1000;

  getStore().set(meetingId, {
    meetingId,
    transcript,
    createdAt: now,
    expiresAt,
  });
}

export function readEphemeralTranscript(meetingId: string) {
  const record = getStore().get(meetingId) ?? null;

  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    getStore().delete(meetingId);
    return null;
  }

  return record;
}

export function consumeEphemeralTranscript(meetingId: string) {
  const record = readEphemeralTranscript(meetingId);

  if (record) {
    getStore().delete(meetingId);
  }

  return record;
}

export function getTranscriptAvailability(meetingId: string) {
  if (!isTranscriptDownloadEnabled()) {
    return {
      status: "disabled" as const,
      downloadEnabled: false,
      message:
        getTranscriptStorageMode() === "disabled"
          ? "Transcript downloads are disabled for this production launch. Findings remain available."
          : "Transcript downloads are currently unavailable.",
      expiresAt: null,
    };
  }

  const record = readEphemeralTranscript(meetingId);

  if (!record) {
    return {
      status: "expired" as const,
      downloadEnabled: false,
      message:
        "The temporary transcript is no longer available. Findings remain permanently available.",
      expiresAt: null,
    };
  }

  return {
    status: "available" as const,
    downloadEnabled: true,
    message: "Transcript is available temporarily and can be downloaded once.",
    expiresAt: new Date(record.expiresAt).toISOString(),
  };
}
