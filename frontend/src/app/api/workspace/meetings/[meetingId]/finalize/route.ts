import { NextResponse } from "next/server";

import {
  queueMeetingProcessing,
  uploadAudioAssetThroughServer,
} from "@/lib/ai-pipeline";
import { internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const contentType = request.headers.get("content-type") || "";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: meeting, error: meetingError } = await admin
      .from("web_meetings")
      .select("*")
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (meetingError) {
      throw meetingError;
    }

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    let sourceText = "";
    let uploadedAsset:
      | {
          bucket: string;
          path: string;
          mimeType?: string | null;
          byteSize?: number | null;
          checksum?: string | null;
        }
      | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const audio = formData.get("audio");

      if (audio instanceof File && audio.size > 0) {
        uploadedAsset = await uploadAudioAssetThroughServer({
          meetingId,
          userId: user.id,
          file: audio,
          mimeType:
            typeof formData.get("mimeType") === "string"
              ? String(formData.get("mimeType"))
              : audio.type,
        });
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        sourceText?: string;
        bucket?: string;
        path?: string;
        mimeType?: string;
        byteSize?: number;
        checksum?: string;
      };
      sourceText = body.sourceText?.trim() || "";
      uploadedAsset =
        body.bucket && body.path
          ? {
              bucket: body.bucket,
              path: body.path,
              mimeType: body.mimeType ?? null,
              byteSize: typeof body.byteSize === "number" ? body.byteSize : null,
              checksum: body.checksum ?? null,
            }
          : null;
    }

    const pipeline = await queueMeetingProcessing({
      meetingId,
      userId: user.id,
      audioAsset: uploadedAsset,
      sourceText,
    });

    return NextResponse.json({
      meetingId,
      redirectTo: `/dashboard/review/${meetingId}`,
      ...pipeline,
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to finalize the meeting session.",
      error,
      "[workspace] Failed to finalize meeting session"
    );
  }
}
