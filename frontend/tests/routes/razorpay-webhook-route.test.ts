import { POST } from "@/app/api/razorpay/webhook/route";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { createAdminClient } from "@/lib/supabase-admin";

vi.mock("@/lib/razorpay", () => ({
  toIsoFromUnixSeconds: (value: number | null | undefined) =>
    value ? new Date(value * 1000).toISOString() : null,
  verifyWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  createAdminClient: vi.fn(),
}));

function jsonRequest(payload: unknown, headers: Record<string, string> = {}) {
  return new Request("https://nextstop.ai/api/razorpay/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

function rawRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://nextstop.ai/api/razorpay/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

function createAdminMock(existingEvent: Record<string, unknown> | null = null) {
  const billingSelect = {
    eq: vi.fn(() => billingSelect),
    maybeSingle: vi.fn(async () => ({ data: existingEvent, error: null })),
  };
  const billingEvents = {
    select: vi.fn(() => billingSelect),
    upsert: vi.fn(async () => ({ error: null })),
  };
  const subscriptions = {
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
      if (table === "billing_events") return billingEvents;
      if (table === "subscriptions") return subscriptions;
      if (table === "profiles") return profiles;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    admin,
    billingEvents,
    subscriptions,
    profiles,
    profileUpdate,
  };
}

function subscriptionPayload(overrides: Record<string, unknown> = {}) {
  return {
    event: "subscription.authenticated",
    payload: {
      subscription: {
        entity: {
          id: "sub_123",
          status: "active",
          plan_id: "plan_pro",
          payment_id: "pay_123",
          current_start: 1_750_000_000,
          current_end: 1_752_592_000,
          notes: {
            supabase_user_id: "user_123",
          },
          ...overrides,
        },
      },
    },
  };
}

const activeSubscriptionPayload = subscriptionPayload();

const paymentOnlyPayload = {
  event: "subscription.authenticated",
  payload: {
    payment: {
      entity: {
        payment_id: "pay_123",
        id: "pay_123",
        status: "captured",
        notes: {
          supabase_user_id: "user_123",
        },
      },
    },
  },
};

describe("POST /api/razorpay/webhook", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("rejects requests missing the Razorpay signature", async () => {
    const response = await POST(jsonRequest(activeSubscriptionPayload));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing webhook signature." });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects invalid Razorpay webhook signatures", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);

    const response = await POST(
      jsonRequest(activeSubscriptionPayload, {
        "x-razorpay-signature": "bad-signature",
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid webhook signature." });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("short-circuits duplicate processed webhook events", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const mocks = createAdminMock({ id: "evt_1", processed_at: "2026-04-28T10:00:00.000Z" });
    vi.mocked(createAdminClient).mockReturnValue(mocks.admin as never);

    const response = await POST(
      jsonRequest(activeSubscriptionPayload, {
        "x-razorpay-signature": "valid-signature",
        "x-razorpay-event-id": "evt_1",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, duplicate: true });
    expect(mocks.billingEvents.upsert).not.toHaveBeenCalled();
    expect(mocks.subscriptions.upsert).not.toHaveBeenCalled();
    expect(mocks.profiles.update).not.toHaveBeenCalled();
  });

  it("records valid subscription events and updates profile entitlements", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const mocks = createAdminMock();
    vi.mocked(createAdminClient).mockReturnValue(mocks.admin as never);

    const response = await POST(
      jsonRequest(activeSubscriptionPayload, {
        "x-razorpay-signature": "valid-signature",
        "x-razorpay-event-id": "evt_active",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.billingEvents.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "razorpay",
        provider_event_id: "evt_active",
        user_id: "user_123",
        provider_subscription_id: "sub_123",
        processing_error: null,
      }),
      { onConflict: "provider_event_id" }
    );
    expect(mocks.subscriptions.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_123",
        provider: "razorpay",
        provider_subscription_id: "sub_123",
        status: "active",
      }),
      { onConflict: "provider_subscription_id" }
    );
    expect(mocks.profiles.update).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_code: "pro_monthly",
        access_state: "active",
        provider_subscription_id: "sub_123",
      })
    );
    expect(mocks.profileUpdate.eq).toHaveBeenCalledWith("id", "user_123");
  });

  it.each([
    {
      status: "cancelled",
      currentEnd: 1_920_000_000,
      expectedAccessState: "active",
      expectedPlanCode: "pro_monthly",
    },
    {
      status: "completed",
      currentEnd: 1_920_000_000,
      expectedAccessState: "active",
      expectedPlanCode: "pro_monthly",
    },
    {
      status: "cancelled",
      currentEnd: 1_600_000_000,
      expectedAccessState: "canceled",
      expectedPlanCode: "none",
    },
    {
      status: "halted",
      currentEnd: 1_920_000_000,
      expectedAccessState: "past_due",
      expectedPlanCode: "none",
    },
    {
      status: "created",
      currentEnd: 1_920_000_000,
      expectedAccessState: "no_plan",
      expectedPlanCode: "none",
    },
  ])(
    "maps $status webhook events to $expectedAccessState access",
    async ({ status, currentEnd, expectedAccessState, expectedPlanCode }) => {
      vi.mocked(verifyWebhookSignature).mockReturnValue(true);
      const mocks = createAdminMock();
      vi.mocked(createAdminClient).mockReturnValue(mocks.admin as never);

      const response = await POST(
        jsonRequest(subscriptionPayload({ status, current_end: currentEnd }), {
          "x-razorpay-signature": "valid-signature",
          "x-razorpay-event-id": `evt_${status}_${currentEnd}`,
        })
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(mocks.profiles.update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_code: expectedPlanCode,
          access_state: expectedAccessState,
          subscription_status: status,
        })
      );
    }
  );

  it("records payment-only events without poisoning subscription entitlements", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const mocks = createAdminMock();
    vi.mocked(createAdminClient).mockReturnValue(mocks.admin as never);

    const response = await POST(
      jsonRequest(paymentOnlyPayload, {
        "x-razorpay-signature": "valid-signature",
        "x-razorpay-event-id": "evt_payment_only",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.billingEvents.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_event_id: "evt_payment_only",
        provider_subscription_id: null,
        user_id: "user_123",
      }),
      { onConflict: "provider_event_id" }
    );
    expect(mocks.subscriptions.upsert).not.toHaveBeenCalled();
    expect(mocks.profiles.update).not.toHaveBeenCalled();
  });

  it("processes duplicate unprocessed events instead of short-circuiting", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const mocks = createAdminMock({ id: "evt_unprocessed", processed_at: null });
    vi.mocked(createAdminClient).mockReturnValue(mocks.admin as never);

    const response = await POST(
      jsonRequest(activeSubscriptionPayload, {
        "x-razorpay-signature": "valid-signature",
        "x-razorpay-event-id": "evt_unprocessed",
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.billingEvents.upsert).toHaveBeenCalled();
    expect(mocks.subscriptions.upsert).toHaveBeenCalled();
  });

  it("rejects signed webhook events outside the replay window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T12:00:00.000Z"));
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);

    const response = await POST(
      jsonRequest(
        {
          ...activeSubscriptionPayload,
          created_at: Math.floor(new Date("2026-04-29T11:45:00.000Z").getTime() / 1000),
        },
        {
          "x-razorpay-signature": "valid-signature",
          "x-razorpay-event-id": "evt_stale",
        }
      )
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Stale webhook event." });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("accepts signed webhook events inside the replay window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T12:00:00.000Z"));
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const mocks = createAdminMock();
    vi.mocked(createAdminClient).mockReturnValue(mocks.admin as never);

    const response = await POST(
      jsonRequest(
        {
          ...activeSubscriptionPayload,
          created_at: Math.floor(new Date("2026-04-29T11:55:30.000Z").getTime() / 1000),
        },
        {
          "x-razorpay-signature": "valid-signature",
          "x-razorpay-event-id": "evt_fresh",
        }
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.billingEvents.upsert).toHaveBeenCalled();
  });

  it("returns a safe server error for malformed JSON after signature verification", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);

    const response = await POST(
      rawRequest("{not-json", {
        "x-razorpay-signature": "valid-signature",
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to process the Razorpay webhook.",
    });
  });

  it("returns a safe server error when billing event persistence fails", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const mocks = createAdminMock();
    mocks.billingEvents.upsert.mockResolvedValueOnce({
      error: new Error("database unavailable"),
    });
    vi.mocked(createAdminClient).mockReturnValue(mocks.admin as never);

    const response = await POST(
      jsonRequest(activeSubscriptionPayload, {
        "x-razorpay-signature": "valid-signature",
        "x-razorpay-event-id": "evt_db_failure",
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to process the Razorpay webhook.",
    });
  });
});
