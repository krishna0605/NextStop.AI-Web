import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { buildDownloadFilename, internalServerErrorResponse } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import type { MeetingFindingsRecord, WebMeetingRecord } from "@/lib/workspace";

export const runtime = "nodejs";

function meetingToLines(meeting: WebMeetingRecord, findings: MeetingFindingsRecord | null) {
  return [
    meeting.title,
    "",
    findings?.summary_short || "No short summary available.",
    "",
    "Summary",
    findings?.summary_full || "No full summary available.",
    "",
    "Executive Bullets",
    ...(findings?.executive_bullets_json?.map((item) => `- ${item}`) ?? ["- Not available"]),
    "",
    "Decisions",
    ...(findings?.decisions_json?.map((item) => `- ${item}`) ?? ["- Not available"]),
    "",
    "Action Items",
    ...(findings?.action_items_json?.map((item) => `- ${item}`) ?? ["- Not available"]),
    "",
    "Risks",
    ...(findings?.risks_json?.map((item) => `- ${item}`) ?? ["- Not available"]),
    "",
    "Follow Ups",
    ...(findings?.follow_ups_json?.map((item) => `- ${item}`) ?? ["- Not available"]),
  ];
}

async function buildPdf(meeting: WebMeetingRecord, findings: MeetingFindingsRecord | null) {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const { width, height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const lines = meetingToLines(meeting, findings);
  let y = height - 56;

  for (const [index, line] of lines.entries()) {
    const isHeading = index === 0 || ["Summary", "Executive Bullets", "Decisions", "Action Items", "Risks", "Follow Ups"].includes(line);
    const size = index === 0 ? 20 : isHeading ? 13 : 10.5;
    const selectedFont = index === 0 || isHeading ? bold : font;
    const wrapped = line ? line.match(/.{1,92}(\s|$)/g) ?? [line] : [""];

    for (const rawSegment of wrapped) {
      const segment = rawSegment.trimEnd();

      if (y < 56) {
        page = pdf.addPage([595, 842]);
        y = 786;
      }

      page.drawText(segment, {
        x: 50,
        y,
        size,
        font: selectedFont,
        color: rgb(0.12, 0.12, 0.14),
        maxWidth: width - 100,
      });
      y -= isHeading ? 20 : 15;
    }

    y -= line ? 3 : 8;
  }

  return await pdf.save();
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const [{ data: meeting }, { data: findings }] = await Promise.all([
      admin
        .from("web_meetings")
        .select("*")
        .eq("id", meetingId)
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("meeting_findings")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
    }

    const pdfBytes = await buildPdf(
      meeting as WebMeetingRecord,
      (findings as MeetingFindingsRecord | null) ?? null
    );

    await admin.from("meeting_exports").insert({
      meeting_id: meetingId,
      user_id: user.id,
      export_type: "pdf",
      status: "downloaded",
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildDownloadFilename(
          (meeting as WebMeetingRecord).title,
          "nextstop",
          "pdf"
        )}"`,
      },
    });
  } catch (error) {
    return internalServerErrorResponse(
      "Unable to generate the PDF export.",
      error,
      "[workspace] Failed to generate PDF export"
    );
  }
}
