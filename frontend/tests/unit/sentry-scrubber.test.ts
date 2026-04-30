import { scrubSentryEvent } from "@/lib/sentry-scrubber";

describe("scrubSentryEvent", () => {
  it("redacts headers, provider tokens, transcripts, audio, and signatures", () => {
    const event = scrubSentryEvent({
      request: {
        headers: {
          authorization: "Bearer secret",
          cookie: "session=secret",
          accept: "application/json",
        },
      },
      extra: {
        transcript: "sensitive meeting text",
        nested: {
          provider_token: "provider-secret",
          harmless: "safe metadata",
        },
      },
      contexts: {
        razorpay: {
          signature: "signed",
          event_id: "evt_123",
        },
      },
    });

    expect(event.request.headers.authorization).toBe("[Filtered]");
    expect(event.request.headers.cookie).toBe("[Filtered]");
    expect(event.request.headers.accept).toBe("application/json");
    expect(event.extra.transcript).toBe("[Filtered]");
    expect(event.extra.nested.provider_token).toBe("[Filtered]");
    expect(event.extra.nested.harmless).toBe("safe metadata");
    expect(event.contexts.razorpay.signature).toBe("[Filtered]");
    expect(event.contexts.razorpay.event_id).toBe("evt_123");
  });
});
