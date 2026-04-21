export type MeetingSourceType =
  | "google_meet"
  | "browser_tab"
  | "quick_notes";

export type MeetingStatus =
  | "scheduled"
  | "draft"
  | "capturing"
  | "finalizing_upload"
  | "queued"
  | "transcribing"
  | "transcript_ready"
  | "analyzing"
  | "processing"
  | "partial_success"
  | "ready"
  | "failed"
  | "cancel_requested"
  | "canceled";

export type IntegrationStatus =
  | "disconnected"
  | "connected"
  | "needs_configuration"
  | "needs_destination"
  | "reconnect_required"
  | "error";

export type TranscriptAvailabilityStatus =
  | "available"
  | "not_ready"
  | "expired"
  | "deleted"
  | "disabled"
  | "local_only";
export type AiPipelineMode = "railway_remote" | "inline_legacy";
export type FindingsGenerationMode = "openai_primary" | "fallback_local";
export type FindingsGenerationStatus = "full_success" | "degraded_success" | "failed";
export type AiJobType = "transcribe" | "analyze" | "finalize" | "regenerate_artifact";
export type AiJobStatus =
  | "queued"
  | "running"
  | "partial_success"
  | "ready"
  | "cancel_requested"
  | "canceled"
  | "failed";
export type AiJobStage =
  | "queued"
  | "uploaded"
  | "materializing_audio"
  | "transcribing"
  | "normalizing"
  | "diarizing"
  | "extracting"
  | "assembling"
  | "regenerating"
  | "canceled"
  | "completed";
export type CaptureSessionStatus =
  | "preparing"
  | "recording"
  | "ending"
  | "sealed"
  | "materializing_audio"
  | "queued_for_transcription"
  | "cancel_requested"
  | "canceled"
  | "failed";
export type MeetingAssetKind = "audio_raw" | "transcript_text";
export type MeetingArtifactType =
  | "canonical_json"
  | "canonical_markdown"
  | "summary"
  | "action_items"
  | "email_draft";
export type AiPhase =
  | "queued"
  | "transcribing"
  | "transcript_ready"
  | "analyzing"
  | "ready"
  | "canceled"
  | "failed";

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
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  current_capture_session_id?: string | null;
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
  generation_mode?: FindingsGenerationMode | null;
  generation_status?: FindingsGenerationStatus | null;
  fallback_reason?: string | null;
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
  latest_error?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
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
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
  cancel_reason?: string | null;
  cancel_requested_by?: string | null;
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
  deleted_at?: string | null;
  deletion_status?: string | null;
  deletion_error?: string | null;
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

export interface MeetingCaptureSessionRecord {
  id: string;
  meeting_id: string;
  user_id: string;
  status: CaptureSessionStatus;
  capture_mode: string;
  source_surface?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  sealed_at?: string | null;
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
  last_client_heartbeat_at?: string | null;
  last_chunk_received_at?: string | null;
  total_chunks_received?: number | null;
  total_bytes_received?: number | null;
  final_asset_bucket?: string | null;
  final_asset_path?: string | null;
  final_asset_status?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AiStatusSnapshot {
  meetingId: string;
  meetingStatus: MeetingStatus;
  captureStatus?: CaptureSessionStatus | null;
  latestJob: AiJobRecord | null;
  artifacts: MeetingArtifactRecord[];
  transcriptAsset: MeetingAssetRecord | null;
  rawAudioAsset: MeetingAssetRecord | null;
  phase: AiPhase;
  transcriptReadyAt?: string | null;
  findingsReadyAt?: string | null;
  timings?: Record<string, unknown> | null;
  latestError: string | null;
  retryCount?: number | null;
  findingsGenerationMode?: FindingsGenerationMode | null;
  findingsGenerationStatus?: FindingsGenerationStatus | null;
  findingsFallbackReason?: string | null;
  surfaceState: "processing" | "ready" | "degraded" | "needs_retry";
  pending: boolean;
  cancelable?: boolean;
  temporaryTranscriptReady?: boolean;
}

export interface TranscriptAvailability {
  status: TranscriptAvailabilityStatus;
  message: string;
  expiresAt?: string | null;
  downloadEnabled: boolean;
}

export interface WorkspaceProviderStatus {
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
}

export interface WorkspaceOverview {
  google: IntegrationRecord | null;
  notion: IntegrationRecord | null;
  meetings: WebMeetingRecord[];
  latestAiJob: AiJobRecord | null;
  findingsByMeetingId: Record<string, MeetingFindingsRecord | undefined>;
  exportsByMeetingId: Record<string, MeetingExportRecord[]>;
  aiStatusByMeetingId: Record<string, AiStatusSnapshot | undefined>;
  providerStatus: WorkspaceProviderStatus;
}

export interface DashboardHomeData {
  google: IntegrationRecord | null;
  notion: IntegrationRecord | null;
  providerStatus: WorkspaceProviderStatus;
}

export interface LibraryMeetingCard {
  id: string;
  title: string;
  status: MeetingStatus;
  sourceType: MeetingSourceType;
  originPlatform: string | null;
  googleEventId?: string | null;
  createdAt: string | null;
  endedAt: string | null;
  scheduledStart: string | null;
  summaryShort: string | null;
  latestAiStage: string | null;
  latestAiJobStatus?: AiJobStatus | null;
  latestError: string | null;
  phase: AiPhase;
  captureStatus?: CaptureSessionStatus | null;
  cancelable?: boolean;
  temporaryTranscriptReady?: boolean;
  exportCount: number;
  artifactCount: number;
  transcriptExpiresAt: string | null;
  findingsGenerationMode: FindingsGenerationMode | null;
  findingsGenerationStatus: FindingsGenerationStatus | null;
  findingsFallbackReason: string | null;
  reviewState: "processing" | "ready" | "degraded" | "needs_retry";
  meetUrl: string | null;
  eventUrl: string | null;
}

export interface LibraryPageData {
  cards: LibraryMeetingCard[];
  query: string;
  limit: number;
  nextCursor: string | null;
  providerStatus: WorkspaceProviderStatus;
}

export interface ReadinessCheckRecord {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface RuntimeIssueRecord {
  name: string;
  detail: string;
}

export interface OpsRecentAiFailure {
  id: string;
  meetingId: string;
  jobType: AiJobType;
  stage: AiJobStage;
  status: AiJobStatus;
  error: string;
  executionMode: string | null;
  findingsGenerationStatus?: FindingsGenerationStatus | null;
  createdAt: string | null;
}

export interface OpsRecentDegradedMeeting {
  meetingId: string;
  title: string;
  generationMode: FindingsGenerationMode;
  generationStatus: FindingsGenerationStatus;
  fallbackReason: string | null;
  updatedAt: string | null;
}

export interface CleanupStatusSnapshot {
  lastCleanupRunAt: string | null;
  lastCleanupSuccessAt: string | null;
  lastCleanupError: string | null;
  deletedAudioAssetCount: number;
  deletedTranscriptAssetCount: number;
  pendingExpiredAssetCount: number;
}

export interface SecurityControlsSnapshot {
  lastEventAt: string | null;
  lastRateLimitDeniedAt: string | null;
  lastTranscriptDownloadGrantedAt: string | null;
  lastTranscriptDownloadBlockedAt: string | null;
  lastExportRequestedAt: string | null;
  rateLimitDeniedCount: number;
  transcriptDownloadGrantedCount: number;
  transcriptDownloadBlockedCount: number;
  exportRequestedCount: number;
  denialByPolicy: Record<string, number>;
  transcriptBlocksByReason: Record<string, number>;
  exportRequestsByPolicy: Record<string, number>;
}

export type HostedVerificationStatus = "unknown" | "pass" | "fail" | "blocked" | "partial";

export interface HostedVerificationScenarioSnapshot {
  status: HostedVerificationStatus;
  detail: string | null;
  checkedAt: string | null;
}

export interface HostedVerificationSnapshot {
  lastHostedVerificationAt: string | null;
  lastHostedVerificationStatus: HostedVerificationStatus;
  lastHostedVerificationScenario: string | null;
  lastHostedVerificationFailureReason: string | null;
  source: string | null;
  scenarios: Record<string, HostedVerificationScenarioSnapshot>;
}

export type LaunchCertificationStatus = "pending" | "certified" | "blocked";

export interface LaunchCertificationSnapshot {
  lastLaunchCertificationAt: string | null;
  lastLaunchCertificationStatus: LaunchCertificationStatus;
  certifiedBy: string | null;
  certificationNotes: string | null;
  validationGreen: boolean;
  hostedVerificationPassed: boolean;
  operationalProofComplete: boolean;
  readinessLaunchDecision: "ready" | "degraded" | "blocked" | null;
}

export interface OpsCaptureSessionSummary {
  captureSessionId: string;
  meetingId: string;
  meetingTitle: string | null;
  status: CaptureSessionStatus;
  lastHeartbeatAt: string | null;
  lastChunkReceivedAt: string | null;
  totalChunksReceived: number;
  totalBytesReceived: number;
  error: string | null;
}

export interface CaptureRuntimeSnapshot {
  activeCaptureSessionCount: number;
  staleCaptureSessionCount: number;
  finalizationBacklogCount: number;
  transcriptReadyAwaitingAnalysisCount: number;
  cancelRequestedJobCount: number;
  sessions: OpsCaptureSessionSummary[];
}

export interface OpsRecentExportFailure {
  id: string;
  meetingId: string;
  exportType: MeetingExportRecord["export_type"];
  status: string;
  destination: string | null;
  latestError: string | null;
  durationMs: number | null;
  createdAt: string | null;
}

export interface OpsReadinessData {
  checks: ReadinessCheckRecord[];
  blockingFailures: RuntimeIssueRecord[];
  warnings: RuntimeIssueRecord[];
  launchDecision: "ready" | "degraded" | "blocked";
  aiCoreHealth: Record<string, unknown> | null;
  recentAiFailures: OpsRecentAiFailure[];
  recentDegradedMeetings: OpsRecentDegradedMeeting[];
  recentExportFailures: OpsRecentExportFailure[];
  appUrl: string;
  backendApiUrl: string | null;
  aiCoreApiUrl: string | null;
  workerReady: boolean;
  queueName: string | null;
  lastWorkerHeartbeatAt: string | null;
  workerVersion: string | null;
  cleanup: CleanupStatusSnapshot | null;
  security: SecurityControlsSnapshot | null;
  hostedVerification: HostedVerificationSnapshot | null;
  launchCertification: LaunchCertificationSnapshot | null;
  captureRuntime: CaptureRuntimeSnapshot;
  lastDeployHint: string;
  observabilityLinks: import("./env").ObservabilityLinks;
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
  finalizing_upload: {
    label: "Finalizing",
    description: "The capture is being secured for backend-owned processing.",
    tone: "warm",
  },
  queued: {
    label: "Queued",
    description: "Backend ownership is complete and the transcription worker is queued.",
    tone: "warm",
  },
  transcribing: {
    label: "Transcribing",
    description: "Audio is being converted into text.",
    tone: "warm",
  },
  transcript_ready: {
    label: "Transcript Ready",
    description: "Transcript is ready and richer findings are now being assembled.",
    tone: "trust",
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
  cancel_requested: {
    label: "Canceling",
    description: "Processing will stop at the next safe checkpoint.",
    tone: "warm",
  },
  canceled: {
    label: "Canceled",
    description: "This meeting was canceled by the user.",
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

function formatWorkspaceDateWithOptions(
  dateString: string | null | undefined,
  options?: { timeZone?: string }
) {
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
    timeZone: options?.timeZone,
  }).format(date);
}

export function formatWorkspaceDate(dateString: string | null | undefined) {
  return formatWorkspaceDateWithOptions(dateString);
}

export function formatWorkspaceDateStable(dateString: string | null | undefined) {
  return formatWorkspaceDateWithOptions(dateString, { timeZone: "UTC" });
}

export function compactList(value: string[] | null | undefined, fallback: string) {
  if (!value || value.length === 0) {
    return [fallback];
  }

  return value;
}
