import { POST as regenerate } from "@/app/api/internal/ai/regenerate/route";
import { POST as transcribe } from "@/app/api/internal/ai/transcribe/route";
import { executeRegenerationJob, executeTranscriptionJob } from "@/lib/ai-pipeline";

vi.mock("@/lib/ai-pipeline", () => ({
  executeRegenerationJob: vi.fn(),
  executeTranscriptionJob: vi.fn(),
}));

function request(payload: unknown, token = "shared-secret") {
  return new Request("https://nextstop.ai/api/internal/ai/test", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("internal AI execution routes", () => {
  beforeEach(() => {
    vi.stubEnv("AI_CORE_SHARED_SECRET", "shared-secret");
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects unauthenticated transcription execution", async () => {
    const response = await transcribe(request({ jobId: "job_123" }, "wrong-secret"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(executeTranscriptionJob).not.toHaveBeenCalled();
  });

  it("validates transcription execution payloads", async () => {
    const response = await transcribe(request({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "jobId is required." });
    expect(executeTranscriptionJob).not.toHaveBeenCalled();
  });

  it("executes transcription jobs through the direct railway mode", async () => {
    const response = await transcribe(request({ jobId: "job_123" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, jobId: "job_123" });
    expect(executeTranscriptionJob).toHaveBeenCalledWith("job_123", "railway_remote");
  });

  it("rejects unauthenticated regeneration execution", async () => {
    const response = await regenerate(request({ jobId: "job_456" }, "wrong-secret"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(executeRegenerationJob).not.toHaveBeenCalled();
  });

  it("returns safe errors when regeneration execution fails", async () => {
    vi.mocked(executeRegenerationJob).mockRejectedValueOnce(new Error("job missing"));

    const response = await regenerate(request({ jobId: "job_456" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "job missing" });
  });
});
