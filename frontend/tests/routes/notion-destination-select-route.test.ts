const saveNotionDestination = vi.fn();
const getUser = vi.fn();

vi.mock("@/lib/notion-workspace", () => ({
  NotionIntegrationError: class NotionIntegrationError extends Error {
    status: number;
    code: string;

    constructor(message: string, status: number, code: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  saveNotionDestination,
}));

vi.mock("@/lib/supabase-server", () => ({
  createClient: async () => ({
    auth: {
      getUser,
    },
  }),
}));

describe("POST /api/workspace/notion/destinations/select", () => {
  beforeEach(() => {
    saveNotionDestination.mockReset();
    getUser.mockReset();
  });

  it("rejects invalid payloads before auth lookups", async () => {
    const { POST } = await import("@/app/api/workspace/notion/destinations/select/route");

    const response = await POST(
      new Request("https://nextstop.ai/api/workspace/notion/destinations/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationId: "", destinationName: "", destinationType: "bad" }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("valid Notion destination");
    expect(getUser).not.toHaveBeenCalled();
  });
});
