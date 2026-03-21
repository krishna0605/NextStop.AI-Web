import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      provider?: "google" | "notion";
    };

    if (body.provider !== "google" && body.provider !== "notion") {
      return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const table =
      body.provider === "google" ? "integrations_google" : "integrations_notion";

    const payload =
      body.provider === "google"
        ? {
            status: "disconnected",
            external_account_email: null,
            selected_calendar_id: null,
            selected_calendar_name: null,
            metadata: {},
            connected_at: null,
          }
        : {
            status: "disconnected",
            external_workspace_name: null,
            selected_destination_id: null,
            selected_destination_name: null,
            metadata: {},
            connected_at: null,
          };

    const { error } = await admin.from(table).upsert({
      user_id: user.id,
      ...payload,
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to disconnect the integration.",
      error,
      "[workspace] Failed to disconnect integration"
    );
  }
}
