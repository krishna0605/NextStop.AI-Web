import { POST as createSubscription } from "@/app/api/billing/subscriptions/create/route";
import { POST as verifySubscription } from "@/app/api/billing/subscriptions/verify/route";
import { POST as startTrial } from "@/app/api/billing/trial/start/route";
import { resolveAccessContext } from "@/lib/billing-server";
import { razorpayRequest, verifySubscriptionCheckoutSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

vi.mock("@/lib/billing-server", () => ({
  resolveAccessContext: vi.fn(),
}));

vi.mock("@/lib/razorpay", () => ({
  razorpayRequest: vi.fn(),
  toIsoFromUnixSeconds: (value: number | null | undefined) =>
    value ? new Date(value * 1000).toISOString() : null,
  verifySubscriptionCheckoutSignature: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createClient: vi.fn(),
}));

function request(payload: unknown) {
  return new Request("https://nextstop.ai/api/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function mockSupabaseUser(user: { id: string; email?: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({
        data: {
          user,
        },
      })),
    },
  } as never);
}

function createAdminMock() {
  const subscriptions = {
    select: vi.fn(() => subscriptions),
    eq: vi.fn(() => subscriptions),
    limit: vi.fn(() => subscriptions),
    insert: vi.fn(async () => ({ error: null })),
    upsert: vi.fn(async () => ({ error: null })),
  };
  const profileUpdate = {
    eq: vi.fn(async () => ({ error: null })),
  };
  const profiles = {
    update: vi.fn(() => profileUpdate),
  };
  const admin = {
    from: vi.fn((table: string) => {
      if (table === "subscriptions") return subscriptions;
      if (table === "profiles") return profiles;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  vi.mocked(createAdminClient).mockReturnValue(admin as never);

  return {
    admin,
    subscriptions,
    profiles,
    profileUpdate,
  };
}

describe("billing API route guardrails", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported subscription plan selections before creating checkout state", async () => {
    const response = await createSubscription(
      request({
        plan_code: "enterprise_unpublished",
        nextPath: "/dashboard",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported plan selection." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("requires an authenticated user before starting a free trial", async () => {
    mockSupabaseUser(null);

    const response = await startTrial(request({ nextPath: "/dashboard" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
  });

  it("rejects subscription verification requests with missing checkout fields", async () => {
    const response = await verifySubscription(
      request({
        razorpay_payment_id: "pay_123",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing Razorpay verification payload." });
    expect(verifySubscriptionCheckoutSignature).not.toHaveBeenCalled();
  });

  it("rejects subscription verification requests with invalid signatures", async () => {
    vi.mocked(verifySubscriptionCheckoutSignature).mockReturnValue(false);

    const response = await verifySubscription(
      request({
        razorpay_payment_id: "pay_123",
        razorpay_subscription_id: "sub_123",
        razorpay_signature: "bad-signature",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid Razorpay signature." });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates Razorpay subscriptions for authenticated eligible Pro users", async () => {
    vi.stubEnv("RAZORPAY_PLAN_ID", "plan_pro");
    vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_key");
    mockSupabaseUser({ id: "user_123", email: "user@example.com" });
    vi.mocked(resolveAccessContext).mockResolvedValue({
      accessState: "no_plan",
      canAccessDashboard: false,
      planCode: "none",
      profile: null,
      subscription: null,
      user: { id: "user_123", email: "user@example.com" },
    } as never);
    vi.mocked(razorpayRequest).mockResolvedValue({
      id: "sub_123",
      plan_id: "plan_pro",
      status: "created",
      current_start: null,
      current_end: null,
      charge_at: 1_750_000_000,
      total_count: 120,
      notes: {
        supabase_user_id: "user_123",
      },
    } as never);
    const mocks = createAdminMock();

    const response = await createSubscription(
      request({
        plan_code: "pro_monthly",
        nextPath: "https://evil.example.com",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      keyId: "rzp_test_key",
      subscriptionId: "sub_123",
      redirectTo: "/dashboard",
    });
    expect(razorpayRequest).toHaveBeenCalledWith(
      "/subscriptions",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(mocks.subscriptions.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_123",
        provider: "razorpay",
        plan_code: "pro_monthly",
        provider_subscription_id: "sub_123",
      }),
      { onConflict: "provider_subscription_id" }
    );
  });

  it("starts a trial and updates profile entitlements for eligible users", async () => {
    mockSupabaseUser({ id: "user_123", email: "user@example.com" });
    vi.mocked(resolveAccessContext).mockResolvedValue({
      accessState: "no_plan",
      canAccessDashboard: false,
      planCode: "none",
      profile: null,
      subscription: null,
      user: { id: "user_123", email: "user@example.com" },
    } as never);
    const mocks = createAdminMock();
    mocks.subscriptions.select.mockReturnValueOnce({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => ({ data: [], error: null })),
        })),
      })),
    });

    const response = await startTrial(request({ nextPath: "/dashboard/library" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/dashboard/library" });
    expect(mocks.subscriptions.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_123",
        provider: "internal_trial",
        plan_code: "pro_trial",
        status: "trialing",
        is_trial: true,
      })
    );
    expect(mocks.profiles.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_code: "pro_trial",
        access_state: "trialing",
        subscription_provider: "internal_trial",
      })
    );
  });

  it("verifies Razorpay checkout signatures and activates paid access", async () => {
    mockSupabaseUser({ id: "user_123", email: "user@example.com" });
    vi.mocked(verifySubscriptionCheckoutSignature).mockReturnValue(true);
    vi.mocked(razorpayRequest).mockResolvedValue({
      id: "sub_123",
      plan_id: "plan_pro",
      status: "active",
      current_start: 1_750_000_000,
      current_end: 1_752_592_000,
      charge_at: null,
      auth_attempts: 1,
    } as never);
    const mocks = createAdminMock();

    const response = await verifySubscription(
      request({
        razorpay_payment_id: "pay_123",
        razorpay_subscription_id: "sub_123",
        razorpay_signature: "valid-signature",
        nextPath: "/dashboard/settings",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ redirectTo: "/dashboard/settings" });
    expect(mocks.subscriptions.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_123",
        provider: "razorpay",
        plan_code: "pro_monthly",
        provider_subscription_id: "sub_123",
        provider_payment_id: "pay_123",
        status: "active",
      }),
      { onConflict: "provider_subscription_id" }
    );
    expect(mocks.profiles.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_code: "pro_monthly",
        access_state: "active",
        subscription_provider: "razorpay",
      })
    );
  });
});
