import type { IntegrationRecord } from "@/lib/workspace";
import { createIntegrationAdminMock } from "@tests/mocks/integration-admin";

const adminMock = createIntegrationAdminMock({});

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: () => adminMock.createAdminClient(),
}));

describe("google workspace token recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    adminMock.state.integrations_google = null;
  });

  it("refreshes an expired token when a refresh token is available", async () => {
    adminMock.state.integrations_google = {
      user_id: "user-1",
      status: "connected",
      metadata: {
        provider_access_token: "stale-token",
        provider_refresh_token: "refresh-token",
      },
    } as IntegrationRecord;

    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "fresh-token" }),
      } as Response);

    const { GoogleIntegrationError, withGoogleAccessToken } = await import("@/lib/google-workspace");

    const action = vi
      .fn()
      .mockRejectedValueOnce(
        new GoogleIntegrationError(
          "Google session expired. Reconnect Google to continue.",
          409,
          "reauth_required"
        )
      )
      .mockResolvedValueOnce("ok");

    await expect(withGoogleAccessToken("user-1", action)).resolves.toBe("ok");
    expect(action).toHaveBeenNthCalledWith(2, expect.objectContaining({ accessToken: "fresh-token" }));
    expect(adminMock.state.integrations_google?.status).toBe("connected");
    expect(adminMock.state.integrations_google?.metadata).toMatchObject({
      provider_access_token: "fresh-token",
      reauth_required: false,
    });
  });

  it("marks the integration for reconnect when refresh cannot recover the token", async () => {
    adminMock.state.integrations_google = {
      user_id: "user-1",
      status: "connected",
      metadata: {
        provider_access_token: "stale-token",
        provider_refresh_token: "refresh-token",
      },
    } as IntegrationRecord;

    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "invalid_grant" }),
      } as Response);

    const { GoogleIntegrationError, withGoogleAccessToken } = await import("@/lib/google-workspace");

    await expect(
      withGoogleAccessToken(
        "user-1",
        async () => {
          throw new GoogleIntegrationError(
            "Google session expired. Reconnect Google to continue.",
            409,
            "reauth_required"
          );
        }
      )
    ).rejects.toMatchObject({ code: "reauth_required" });

    expect(adminMock.state.integrations_google?.status).toBe("reconnect_required");
    expect(adminMock.state.integrations_google?.metadata).toMatchObject({
      reauth_required: true,
      last_error: "Google session expired. Reconnect Google to continue.",
    });
  });
});
