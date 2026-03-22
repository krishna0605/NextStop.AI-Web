import {
  consumeEphemeralTranscript,
  getTranscriptAvailability,
  rememberEphemeralTranscript,
} from "@/lib/workspace-runtime";

describe("workspace transcript runtime", () => {
  beforeEach(() => {
    globalThis.__nextstopTranscriptStore = undefined;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.__nextstopTranscriptStore = undefined;
  });

  it("reports disabled transcript access when production mode disables downloads", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRANSCRIPT_STORAGE_MODE", "disabled");

    expect(getTranscriptAvailability("meeting-1")).toMatchObject({
      status: "disabled",
      downloadEnabled: false,
    });
  });

  it("stores and consumes a temporary transcript", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TRANSCRIPT_STORAGE_MODE", "memory");
    vi.stubEnv("TRANSCRIPT_RETENTION_MINUTES", "30");

    rememberEphemeralTranscript("meeting-1", "Hello world");

    expect(getTranscriptAvailability("meeting-1")).toMatchObject({
      status: "available",
      downloadEnabled: true,
    });

    expect(consumeEphemeralTranscript("meeting-1")?.transcript).toBe("Hello world");
    expect(getTranscriptAvailability("meeting-1").status).toBe("expired");
  });
});
