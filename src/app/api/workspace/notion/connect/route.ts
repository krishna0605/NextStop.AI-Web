import { NextResponse } from "next/server";

import { getNotionOAuthConfigured } from "@/lib/env";
import { internalServerErrorResponse } from "@/lib/http";
import { buildNotionAuthorizeUrl } from "@/lib/notion-workspace";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!getNotionOAuthConfigured()) {
      return NextResponse.json(
        { error: "Notion OAuth is not configured on the server yet." },
        { status: 503 }
      );
    }

    const authorizeUrl = buildNotionAuthorizeUrl(user.id, new URL(request.url).origin);

    return NextResponse.json({ authorizeUrl });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to start the Notion connection flow.",
      error,
      "[workspace] Failed to start Notion connection flow"
    );
  }
}
