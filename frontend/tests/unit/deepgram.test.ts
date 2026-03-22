import { transcribeWithDeepgramResult } from "@/lib/deepgram";

describe("transcribeWithDeepgramResult", () => {
  it("retries retryable Deepgram failures and returns normalized metadata", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "deepgram-test-key");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ err_msg: "Rate limited" }), { status: 429 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            metadata: {
              request_id: "req-123",
              model_info: {
                "nova-2": {
                  name: "nova-2",
                  version: "2026.03",
                },
              },
            },
            results: {
              channels: [
                {
                  detected_language: "en",
                  alternatives: [
                    {
                      transcript: "Hello team. We shipped the transcription worker.",
                      confidence: 0.93,
                      utterances: [
                        {
                          start: 0,
                          end: 2.1,
                          speaker: 0,
                          transcript: "Hello team.",
                          confidence: 0.91,
                        },
                        {
                          start: 2.1,
                          end: 5.4,
                          speaker: 1,
                          transcript: "We shipped the transcription worker.",
                          confidence: 0.95,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200 }
        )
      );

    vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock as typeof fetch);

    const file = new File(["audio-bytes"], "meeting.webm", { type: "audio/webm" });
    const result = await transcribeWithDeepgramResult(file);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.transcript).toContain("transcription worker");
    expect(result.requestId).toBe("req-123");
    expect(result.sourceModel).toBe("deepgram:nova-2@2026.03");
    expect(result.paragraphs).toHaveLength(2);
    expect(result.providerMetadata).toMatchObject({
      provider: "deepgram",
      requestId: "req-123",
      paragraphCount: 2,
    });
  });

  it("fails when Deepgram returns an empty transcript", async () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "deepgram-test-key");

    vi.spyOn(globalThis, "fetch").mockImplementation(
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: {
              channels: [
                {
                  alternatives: [
                    {
                      transcript: "   ",
                    },
                  ],
                },
              ],
            },
          }),
          { status: 200 }
        )
      ) as typeof fetch
    );

    const file = new File(["audio-bytes"], "meeting.webm", { type: "audio/webm" });

    await expect(transcribeWithDeepgramResult(file)).rejects.toThrow(
      /empty transcript/i
    );
  });
});
