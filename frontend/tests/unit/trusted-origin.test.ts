import { validateTrustedMutationOrigin } from "@/lib/trusted-origin";

describe("trusted mutation origin guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts same-origin mutation requests", () => {
    const result = validateTrustedMutationOrigin(
      new Request("https://nextstop.ai/api/billing/trial/start", {
        method: "POST",
        headers: {
          origin: "https://nextstop.ai",
        },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        trusted: true,
        reason: "same-origin",
        receivedOrigin: "https://nextstop.ai",
      })
    );
  });

  it("accepts explicitly configured trusted app origins", () => {
    vi.stubEnv("TRUSTED_APP_ORIGINS", "https://app.nextstop.ai, https://admin.nextstop.ai");

    const result = validateTrustedMutationOrigin(
      new Request("https://nextstop.ai/api/workspace/google/calendars/select", {
        method: "POST",
        headers: {
          origin: "https://admin.nextstop.ai",
        },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        trusted: true,
        reason: "trusted-origin",
        receivedOrigin: "https://admin.nextstop.ai",
      })
    );
  });

  it("rejects hostile cross-origin mutation requests", () => {
    const result = validateTrustedMutationOrigin(
      new Request("https://nextstop.ai/api/workspace/meetings/start", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
        },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        trusted: false,
        reason: "untrusted-origin",
        receivedOrigin: "https://attacker.example",
      })
    );
  });

  it("rejects malformed or opaque origins", () => {
    const result = validateTrustedMutationOrigin(
      new Request("https://nextstop.ai/api/workspace/meetings/start", {
        method: "POST",
        headers: {
          origin: "null",
        },
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        trusted: false,
        reason: "invalid-origin",
      })
    );
  });

  it("allows missing Origin and Referer for non-browser service callers", () => {
    const result = validateTrustedMutationOrigin(
      new Request("https://nextstop.ai/api/workspace/meetings/start", {
        method: "POST",
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        trusted: true,
        reason: "missing-origin",
        receivedOrigin: null,
      })
    );
  });
});
