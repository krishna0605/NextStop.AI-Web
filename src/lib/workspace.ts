export type MeetingSourceType =
  | "google_meet"
  | "browser_tab"
  | "quick_notes";

export type MeetingStatus =
  | "scheduled"
  | "draft"
  | "capturing"
  | "processing"
  | "ready"
  | "failed"
  | "canceled";

export type IntegrationStatus =
  | "disconnected"
  | "connected"
  | "needs_configuration";

export interface IntegrationRecord {
  user_id: string;
  status: IntegrationStatus;
  external_account_email?: string | null;
  external_workspace_name?: string | null;
  selected_calendar_id?: string | null;
  selected_calendar_name?: string | null;
  selected_destination_id?: string | null;
  selected_destination_name?: string | null;
  metadata?: Record<string, unknown> | null;
  connected_at?: string | null;
  updated_at?: string | null;
}

export interface WebMeetingRecord {
  id: string;
  user_id: string;
  title: string;
  source_type: MeetingSourceType;
  status: MeetingStatus;
  google_event_id?: string | null;
  notion_destination_id?: string | null;
  tags?: string[] | null;
  session_metadata?: Record<string, unknown> | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeetingFindingsRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  status: "ready" | "failed";
  summary_short?: string | null;
  summary_full?: string | null;
  executive_bullets_json?: string[] | null;
  decisions_json?: string[] | null;
  action_items_json?: string[] | null;
  risks_json?: string[] | null;
  follow_ups_json?: string[] | null;
  email_draft?: string | null;
  source_model?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeetingExportRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  export_type: "pdf" | "notion" | "copy" | "email_draft" | "transcript";
  status: string;
  destination?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface WorkspaceOverview {
  google: IntegrationRecord | null;
  notion: IntegrationRecord | null;
  meetings: WebMeetingRecord[];
  findingsByMeetingId: Record<string, MeetingFindingsRecord | undefined>;
  exportsByMeetingId: Record<string, MeetingExportRecord[]>;
  providerStatus: {
    deepgramConfigured: boolean;
    openAiConfigured: boolean;
    googleConfigured: boolean;
    notionConfigured: boolean;
  };
}

export const MEETING_SOURCE_LABELS: Record<MeetingSourceType, string> = {
  google_meet: "Google Meet",
  browser_tab: "Browser Tab",
  quick_notes: "Quick Notes",
};

export const MEETING_STATUS_COPY: Record<
  MeetingStatus,
  { label: string; description: string; tone: "warm" | "trust" | "neutral" | "danger" }
> = {
  scheduled: {
    label: "Scheduled",
    description: "Meeting created and waiting for capture to begin.",
    tone: "warm",
  },
  draft: {
    label: "Draft",
    description: "Session created but not started yet.",
    tone: "neutral",
  },
  capturing: {
    label: "Live",
    description: "The browser session is currently live.",
    tone: "trust",
  },
  processing: {
    label: "Processing",
    description: "Transcript is being converted into findings.",
    tone: "warm",
  },
  ready: {
    label: "Ready",
    description: "Summary and findings are ready for review.",
    tone: "trust",
  },
  failed: {
    label: "Needs Attention",
    description: "The meeting ended, but findings were not generated.",
    tone: "danger",
  },
  canceled: {
    label: "Canceled",
    description: "This meeting was canceled before capture completed.",
    tone: "neutral",
  },
};

export function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function formatWorkspaceDate(dateString: string | null | undefined) {
  if (!dateString) {
    return "Not set";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function compactList(value: string[] | null | undefined, fallback: string) {
  if (!value || value.length === 0) {
    return [fallback];
  }

  return value;
}
