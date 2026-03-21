type EphemeralTranscriptRecord = {
  meetingId: string;
  transcript: string;
  createdAt: number;
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
  getStore().set(meetingId, {
    meetingId,
    transcript,
    createdAt: Date.now(),
  });
}

export function readEphemeralTranscript(meetingId: string) {
  return getStore().get(meetingId) ?? null;
}

export function consumeEphemeralTranscript(meetingId: string) {
  const record = getStore().get(meetingId) ?? null;

  if (record) {
    getStore().delete(meetingId);
  }

  return record;
}
