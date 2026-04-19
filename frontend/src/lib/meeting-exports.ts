import "server-only";

import { createAdminClient } from "@/lib/supabase-admin";
import type { MeetingExportRecord } from "@/lib/workspace";

type ExportType = MeetingExportRecord["export_type"];

type StartExportArgs = {
  meetingId: string;
  userId: string;
  exportType: ExportType;
  destination?: string | null;
  metadata?: Record<string, unknown>;
};

type CompleteExportArgs = {
  exportId: string;
  userId: string;
  status?: "completed" | "downloaded";
  destination?: string | null;
  metadata?: Record<string, unknown>;
  startedAt: number;
};

type FailExportArgs = {
  exportId: string;
  userId: string;
  error: string;
  metadata?: Record<string, unknown>;
  startedAt: number;
};

export async function startMeetingExport(args: StartExportArgs) {
  const admin = createAdminClient();
  const startedAt = Date.now();
  const { data, error } = await admin
    .from("meeting_exports")
    .insert({
      meeting_id: args.meetingId,
      user_id: args.userId,
      export_type: args.exportType,
      status: "processing",
      destination: args.destination ?? null,
      latest_error: null,
      metadata: {
        ...(args.metadata ?? {}),
        started_via: "next_api",
      },
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return {
    exportId: data.id as string,
    startedAt,
  };
}

export async function completeMeetingExport(args: CompleteExportArgs) {
  const admin = createAdminClient();
  const durationMs = Math.max(0, Date.now() - args.startedAt);
  const { error } = await admin
    .from("meeting_exports")
    .update({
      status: args.status ?? "completed",
      destination: args.destination ?? null,
      latest_error: null,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      metadata: {
        ...(args.metadata ?? {}),
        completed_via: "next_api",
      },
    })
    .eq("id", args.exportId)
    .eq("user_id", args.userId);

  if (error) {
    throw error;
  }
}

export async function failMeetingExport(args: FailExportArgs) {
  const admin = createAdminClient();
  const durationMs = Math.max(0, Date.now() - args.startedAt);
  const { error } = await admin
    .from("meeting_exports")
    .update({
      status: "failed",
      latest_error: args.error,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      metadata: {
        ...(args.metadata ?? {}),
        error: args.error,
        failed_via: "next_api",
      },
    })
    .eq("id", args.exportId)
    .eq("user_id", args.userId);

  if (error) {
    throw error;
  }
}
