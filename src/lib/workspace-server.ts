import "server-only";

import type { User } from "@supabase/supabase-js";

import { isNotionBrokerConfigured } from "./notion-workspace";
import type { createClient as createServerClient } from "@/lib/supabase-server";
import {
  getGoogleOAuthRefreshSupport,
  getTranscriptStorageMode,
  isTranscriptDownloadEnabled,
} from "@/lib/env";
import { getTranscriptAvailability } from "@/lib/workspace-runtime";

import type { ProfileRecord } from "./billing";
import { createAdminClient } from "./supabase-admin";
import type {
  IntegrationRecord,
  MeetingExportRecord,
  MeetingFindingsRecord,
  WebMeetingRecord,
  WorkspaceOverview,
} from "./workspace";

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

function getAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

function isWorkspaceSchemaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  };

  const combined = [
    maybeError.code,
    maybeError.message,
    maybeError.details,
    maybeError.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("schema cache") ||
    combined.includes("relation") ||
    combined.includes("does not exist") ||
    combined.includes("column") ||
    maybeError.code === "42P01" ||
    maybeError.code === "42703" ||
    maybeError.code === "PGRST204"
  );
}

function logWorkspaceFallback(label: string, error: unknown) {
  console.warn(`[workspace] Falling back in ${label}`, error);
}

async function queryMaybeSingle<T>(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  table: string,
  userId: string
) {
  try {
    const { data, error } = await client
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as T | null) ?? null;
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback(`queryMaybeSingle(${table})`, error);
      return null;
    }

    throw error;
  }
}

async function queryMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  userId: string,
  limit = 6
) {
  try {
    const { data, error } = await client
      .from("web_meetings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data as WebMeetingRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryFindingsForMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  meetingIds: string[]
) {
  if (meetingIds.length === 0) {
    return [] as MeetingFindingsRecord[];
  }

  try {
    const { data, error } = await client
      .from("meeting_findings")
      .select("*")
      .in("meeting_id", meetingIds);

    if (error) {
      throw error;
    }

    return (data as MeetingFindingsRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryFindingsForMeetings", error);
      return [];
    }

    throw error;
  }
}

async function queryExportsForMeetings(
  client: ServerClient | ReturnType<typeof createAdminClient>,
  meetingIds: string[]
) {
  if (meetingIds.length === 0) {
    return [] as MeetingExportRecord[];
  }

  try {
    const { data, error } = await client
      .from("meeting_exports")
      .select("*")
      .in("meeting_id", meetingIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data as MeetingExportRecord[] | null) ?? [];
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("queryExportsForMeetings", error);
      return [];
    }

    throw error;
  }
}

export function getWorkspaceProviderStatus() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return {
    deepgramConfigured: Boolean(process.env.DEEPGRAM_API_KEY),
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    googleConfigured: supabaseConfigured,
    googleRefreshConfigured: getGoogleOAuthRefreshSupport(),
    notionConfigured: isNotionBrokerConfigured(),
    transcriptDownloadsEnabled: isTranscriptDownloadEnabled(),
    transcriptStorageMode: getTranscriptStorageMode(),
  };
}

export async function loadWorkspaceOverview(
  supabase: ServerClient,
  user: User
): Promise<WorkspaceOverview> {
  const admin = getAdminClient();
  const queryClient = admin ?? supabase;

  const [google, notion, meetings] = await Promise.all([
    queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_google", user.id),
    queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_notion", user.id),
    queryMeetings(queryClient, user.id),
  ]);

  const meetingIds = meetings.map((meeting) => meeting.id);
  const [findings, exports] = await Promise.all([
    queryFindingsForMeetings(queryClient, meetingIds),
    queryExportsForMeetings(queryClient, meetingIds),
  ]);

  return {
    google,
    notion,
    meetings,
    findingsByMeetingId: Object.fromEntries(
      findings.map((finding) => [finding.meeting_id, finding])
    ),
    exportsByMeetingId: exports.reduce<Record<string, MeetingExportRecord[]>>(
      (acc, item) => {
        acc[item.meeting_id] = acc[item.meeting_id] ?? [];
        acc[item.meeting_id].push(item);
        return acc;
      },
      {}
    ),
    providerStatus: getWorkspaceProviderStatus(),
  };
}

export async function loadMeetingDetail(
  supabase: ServerClient,
  userId: string,
  meetingId: string
) {
  const admin = getAdminClient();
  const queryClient = admin ?? supabase;

  try {
    const { data: meeting, error: meetingError } = await queryClient
      .from("web_meetings")
      .select("*")
      .eq("id", meetingId)
      .eq("user_id", userId)
      .maybeSingle();

    if (meetingError) {
      throw meetingError;
    }

    if (!meeting) {
      return null;
    }

    const [{ data: findings }, { data: exports }, google, notion] = await Promise.all([
      queryClient
        .from("meeting_findings")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .maybeSingle(),
      queryClient
        .from("meeting_exports")
        .select("*")
        .eq("meeting_id", meetingId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_google", userId),
      queryMaybeSingle<IntegrationRecord>(queryClient, "integrations_notion", userId),
    ]);

    return {
      meeting: meeting as WebMeetingRecord,
      findings: (findings as MeetingFindingsRecord | null) ?? null,
      exports: (exports as MeetingExportRecord[] | null) ?? [],
      google,
      notion,
      transcriptAvailability: getTranscriptAvailability(meetingId),
      providerStatus: getWorkspaceProviderStatus(),
    };
  } catch (error) {
    if (isWorkspaceSchemaError(error)) {
      logWorkspaceFallback("loadMeetingDetail", error);
      return null;
    }

    throw error;
  }
}

export function getWorkspaceDisplayName(user: User, profile: ProfileRecord | null) {
  return (
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Operator"
  );
}
