import { NextResponse } from "next/server";

import { internalServerErrorResponse } from "@/lib/http";
import { NotionIntegrationError, saveNotionDestination } from "@/lib/notion-workspace";
import { createClient } from "@/lib/supabase-server";
import type { NotionDestinationType } from "@/lib/workspace";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      destinationId?: string;
      destinationName?: string;
      destinationType?: NotionDestinationType;
    };

    if (
      !body.destinationId ||
      !body.destinationName ||
      (body.destinationType !== "page" && body.destinationType !== "database")
    ) {
      return NextResponse.json({ error: "A valid Notion destination is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    await saveNotionDestination({
      userId: user.id,
      destinationId: body.destinationId,
      destinationName: body.destinationName,
      destinationType: body.destinationType,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotionIntegrationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return internalServerErrorResponse(
      "Unable to save the Notion destination.",
      error,
      "[workspace] Failed to save Notion destination"
    );
  }
}
