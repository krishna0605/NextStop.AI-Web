export type MeetingSourceType =
  | "google_meet"
  | "browser_tab"
  | "quick_notes";

export type MeetingStatus =
  | "scheduled"
  | "draft"
  | "capturing"
  | "queued"
  | "transcribing"
  | "analyzing"
  | "processing"
  | "partial_success"
  | "ready"
  | "failed"
  | "canceled";

export type IntegrationStatus =
  | "disconnected"
  | "connected"
  | "needs_configuration"
  | "needs_destination"
  | "reconnect_required"
  | "error";

export type TranscriptAvailabilityStatus = "available" | "expired" | "disabled" | "local_only";
export type AiPipelineMode = "railway_remote" | "inline_legacy";
export type AiJobType = "transcribe" | "finalize" | "regenerate_artifact";
export type AiJobStatus = "queued" | "running" | "partial_success" | "ready" | "failed";
export type AiJobStage =
  | "queued"
  | "uploaded"
  | "transcribing"
  | "normalizing"
  | "diarizing"
  | "extracting"
  | "assembling"
  | "regenerating"
  | "completed";
export type MeetingAssetKind = "audio_raw" | "transcript_text";
export type MeetingArtifactType =
  | "canonical_json"
  | "canonical_markdown"
  | "summary"
  | "action_items"
  | "email_draft";

export type NotionDestinationType = "page" | "database";

export interface NotionDestination {
  id: string;
  name: string;
  type: NotionDestinationType;
  url?: string | null;
}

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
  origin_platform?: string | null;
  origin_device_id?: string | null;
  external_local_id?: string | null;
  transcript_storage?: "local_only" | "none" | null;
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

export interface AiJobRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  job_type: AiJobType;
  artifact_type?: MeetingArtifactType | null;
  status: AiJobStatus;
  stage: AiJobStage;
  attempts?: number | null;
  provider_metadata?: Record<string, unknown> | null;
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeetingAssetRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  asset_kind: MeetingAssetKind;
  bucket: string;
  path: string;
  mime_type?: string | null;
  byte_size?: number | null;
  checksum?: string | null;
  status: string;
  expires_at?: string | null;
  created_by_job_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeetingArtifactRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  artifact_type: MeetingArtifactType;
  status: string;
  payload_json?: Record<string, unknown> | null;
  payload_text?: string | null;
  source_model?: string | null;
  version?: number | null;
  metadata?: Record<string, unknown> | null;
  created_by_job_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SpeakerSegmentRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  speaker_label: string;
  start_ms: number;
  end_ms: number;
  text_snippet?: string | null;
  confidence?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface AiStatusSnapshot {
  meetingId: string;
  meetingStatus: MeetingStatus;
  latestJob: AiJobRecord | null;
  artifacts: MeetingArtifactRecord[];
  transcriptAsset: MeetingAssetRecord | null;
  rawAudioAsset: MeetingAssetRecord | null;
  pending: boolean;
}

export interface TranscriptAvailability {
  status: TranscriptAvailabilityStatus;
  message: string;
  expiresAt?: string | null;
  downloadEnabled: boolean;
}

export interface WorkspaceOverview {
  google: IntegrationRecord | null;
  notion: IntegrationRecord | null;
  meetings: WebMeetingRecord[];
  findingsByMeetingId: Record<string, MeetingFindingsRecord | undefined>;
  exportsByMeetingId: Record<string, MeetingExportRecord[]>;
  aiStatusByMeetingId: Record<string, AiStatusSnapshot | undefined>;
  providerStatus: {
    deepgramConfigured: boolean;
    openAiConfigured: boolean;
    aiCoreConfigured: boolean;
    huggingFaceConfigured: boolean;
    googleConfigured: boolean;
    googleRefreshConfigured: boolean;
    notionConfigured: boolean;
    transcriptDownloadsEnabled: boolean;
    transcriptStorageMode: "memory" | "disabled";
    transcriptRetentionMinutes: number;
    rawAssetRetentionHours: number;
    aiPipelineMode: AiPipelineMode;
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
  queued: {
    label: "Queued",
    description: "Audio upload is complete and the transcription worker is queued.",
    tone: "warm",
  },
  transcribing: {
    label: "Transcribing",
    description: "Audio is being converted into text.",
    tone: "warm",
  },
  analyzing: {
    label: "Analyzing",
    description: "Structured findings are being generated from the stored transcript.",
    tone: "warm",
  },
  processing: {
    label: "Processing",
    description: "Transcript assets are being normalized and handed to downstream findings.",
    tone: "warm",
  },
  partial_success: {
    label: "Partial",
    description: "Some AI artifacts are ready, while others still need regeneration.",
    tone: "danger",
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
