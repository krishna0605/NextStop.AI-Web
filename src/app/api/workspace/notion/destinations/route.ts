import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { loadNotionDestinations, NotionIntegrationError } from "@/lib/notion-workspace";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const destinations = await loadNotionDestinations(user.id);

    return NextResponse.json({ destinations });
  } catch (error) {
    if (error instanceof NotionIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return internalServerErrorResponse(
      "Unable to load Notion destinations.",
      error,
      "[workspace] Failed to load Notion destinations"
    );
  }
}
