import type { IntegrationRecord } from "@/lib/workspace";
import { createIntegrationAdminMock } from "@tests/mocks/integration-admin";

const adminMock = createIntegrationAdminMock({});

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => adminMock.createAdminClient(),
}));

describe("notion workspace helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    adminMock.state.integrations_notion = null;
  });

  it("builds a signed authorize URL and verifies the state", async () => {
    vi.stubEnv("NOTION_CLIENT_ID", "client-id");
    vi.stubEnv("NOTION_CLIENT_SECRET", "client-secret");
    vi.stubEnv("NOTION_OAUTH_STATE_SECRET", "state-secret");
    vi.stubEnv("APP_URL", "https://nextstop.ai");

    const { buildNotionAuthorizeUrl, verifyNotionState } = await import("@/lib/notion-workspace");
    const url = new URL(buildNotionAuthorizeUrl("user-1"));
    const state = url.searchParams.get("state");

    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://nextstop.ai/api/workspace/notion/callback"
    );
    expect(state).toBeTruthy();

    const payload = verifyNotionState<{ userId: string; redirectUri: string }>(state!);
    expect(payload.userId).toBe("user-1");
    expect(payload.redirectUri).toBe("https://nextstop.ai/api/workspace/notion/callback");
  });

  it("rejects destination saves when reconnect is required", async () => {
    adminMock.state.integrations_notion = {
      user_id: "user-1",
      status: "reconnect_required",
      metadata: {},
    } as IntegrationRecord;

    const { saveNotionDestination } = await import("@/lib/notion-workspace");

    await expect(
      saveNotionDestination({
        userId: "user-1",
        destinationId: "page-1",
        destinationName: "Product Notes",
        destinationType: "page",
      })
    ).rejects.toMatchObject({
      name: "NotionIntegrationError",
      code: "reauth_required",
    });
  });
});
