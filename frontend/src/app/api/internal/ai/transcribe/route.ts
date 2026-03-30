import { NextResponse } from "next/server";

import { executeTranscriptionJob } from "@/lib/ai-pipeline";

export const runtime = "nodejs";

function authorize(request: Request) {
  const expected = process.env.AI_CORE_SHARED_SECRET?.trim();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!expected || !token || token !== expected) {
    return false;
  }

  return true;
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { jobId?: string };

    if (!body.jobId) {
      return NextResponse.json({ error: "jobId is required." }, { status: 400 });
    }

    await executeTranscriptionJob(body.jobId, "railway_remote");

    return NextResponse.json({ ok: true, jobId: body.jobId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to execute the transcription job.",
      },
      { status: 500 }
    );
  }
}
