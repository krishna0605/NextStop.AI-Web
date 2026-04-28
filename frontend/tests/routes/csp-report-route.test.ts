import { POST } from "@/app/api/security/csp-report/route";

describe("POST /api/security/csp-report", () => {
  it("accepts CSP report-only payloads without echoing details to the client", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await POST(
      new Request("https://nextstop.ai/api/security/csp-report", {
        method: "POST",
        headers: {
          "content-type": "application/csp-report",
        },
        body: JSON.stringify({
          "csp-report": {
            "document-uri": "https://nextstop.ai/dashboard?token=redacted",
            "blocked-uri": "https://cdn.example.com/script.js?secret=redacted",
            "violated-directive": "script-src",
            "effective-directive": "script-src",
            disposition: "report",
            "status-code": 200,
          },
        }),
      })
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(warn).toHaveBeenCalledWith(
      "[security] CSP report-only violation",
      expect.objectContaining({
        documentUri: "https://nextstop.ai/dashboard",
        blockedUri: "https://cdn.example.com/script.js",
        effectiveDirective: "script-src",
      })
    );
  });

  it("rejects oversized CSP reports before logging", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await POST(
      new Request("https://nextstop.ai/api/security/csp-report", {
        method: "POST",
        headers: {
          "content-length": "64001",
        },
        body: "{}",
      })
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "CSP report too large." });
    expect(warn).not.toHaveBeenCalled();
  });
});
