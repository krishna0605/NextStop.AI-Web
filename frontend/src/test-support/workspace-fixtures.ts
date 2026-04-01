import type {
  AiStatusSnapshot,
  DashboardHomeData,
  IntegrationRecord,
  LibraryPageData,
  MeetingArtifactRecord,
  MeetingExportRecord,
  MeetingFindingsRecord,
  TranscriptAvailability,
  WebMeetingRecord,
  WorkspaceOverview,
} from "@/lib/workspace";

export const smokeGoogleReconnectRecord: IntegrationRecord = {
  user_id: "user-1",
  status: "reconnect_required",
  external_account_email: "krishna@example.com",
  metadata: {
    last_error: "Google session expired. Reconnect Google to continue.",
  },
};

export const smokeNotionNeedsDestinationRecord: IntegrationRecord = {
  user_id: "user-1",
  status: "needs_destination",
  external_workspace_name: "Krishna's Notion",
  selected_destination_id: null,
  selected_destination_name: null,
  metadata: {
    connected_via: "next_api",
    destination_type: null,
  },
};

export const smokeReadyMeeting: WebMeetingRecord = {
  id: "meeting-ready-1",
  user_id: "user-1",
  title: "Candidate Interview",
  source_type: "browser_tab",
  status: "ready",
  created_at: "2026-03-21T11:30:00.000Z",
};

export const smokeProcessingMeeting: WebMeetingRecord = {
  id: "meeting-processing-1",
  user_id: "user-1",
  title: "Product Review",
  source_type: "google_meet",
  status: "processing",
  created_at: "2026-03-21T12:00:00.000Z",
  session_metadata: {
    meet_url: "https://meet.google.com/example",
    event_url: "https://calendar.google.com/event?eid=abc",
    scheduled_start: "2026-03-21T13:00:00.000Z",
  },
};

export const smokeReadyFindings: MeetingFindingsRecord = {
  id: "findings-1",
  meeting_id: smokeReadyMeeting.id,
  user_id: "user-1",
  status: "ready",
  summary_short: "Strong alignment on backend ownership and API design.",
  summary_full:
    "The candidate demonstrated strong backend ownership, clear API design judgment, and comfort with production debugging.",
  executive_bullets_json: [
    "Strong backend ownership",
    "Comfortable with production debugging",
  ],
  decisions_json: ["Move the candidate to the final round."],
  action_items_json: ["Schedule the final technical round."],
  risks_json: ["Need deeper assessment on distributed systems depth."],
  follow_ups_json: ["Share the final-round prep notes with the panel."],
  email_draft: "Sharing the interview findings and next-step recommendation.",
  created_at: "2026-03-21T11:45:00.000Z",
};

export const smokeMeetingExports: MeetingExportRecord[] = [
  {
    id: "export-1",
    meeting_id: smokeReadyMeeting.id,
    user_id: "user-1",
    export_type: "pdf",
    status: "completed",
    created_at: "2026-03-21T11:50:00.000Z",
  },
  {
    id: "export-2",
    meeting_id: smokeReadyMeeting.id,
    user_id: "user-1",
    export_type: "notion",
    status: "completed",
    created_at: "2026-03-21T11:55:00.000Z",
  },
];

export const smokeMeetingArtifacts: MeetingArtifactRecord[] = [
  {
    id: "artifact-1",
    meeting_id: smokeReadyMeeting.id,
    user_id: "user-1",
    artifact_type: "summary",
    status: "ready",
    payload_text: smokeReadyFindings.summary_full,
    source_model: "gpt-4o-mini",
    version: 1,
  },
  {
    id: "artifact-2",
    meeting_id: smokeReadyMeeting.id,
    user_id: "user-1",
    artifact_type: "action_items",
    status: "ready",
    payload_text: smokeReadyFindings.action_items_json?.join("\n"),
    source_model: "gpt-4o-mini",
    version: 1,
  },
  {
    id: "artifact-3",
    meeting_id: smokeReadyMeeting.id,
    user_id: "user-1",
    artifact_type: "email_draft",
    status: "ready",
    payload_text: smokeReadyFindings.email_draft,
    source_model: "gpt-4o-mini",
    version: 1,
  },
];

export const smokeAiStatusReady: AiStatusSnapshot = {
  meetingId: smokeReadyMeeting.id,
  meetingStatus: "ready",
  latestJob: {
    id: "job-1",
    meeting_id: smokeReadyMeeting.id,
    user_id: "user-1",
    job_type: "transcribe",
    status: "ready",
    stage: "completed",
    provider_metadata: {
      transcription: {
        status: "ready",
        sourceModel: "deepgram:nova-2",
      },
      findings: {
        status: "ready",
        sourceModel: "gpt-4o-mini",
      },
    },
    created_at: "2026-03-21T11:46:00.000Z",
    updated_at: "2026-03-21T11:47:00.000Z",
  },
  artifacts: smokeMeetingArtifacts,
  transcriptAsset: null,
  rawAudioAsset: null,
  phase: "ready",
  transcriptReadyAt: "2026-03-21T11:46:30.000Z",
  findingsReadyAt: "2026-03-21T11:47:00.000Z",
  timings: {
    transcribeMs: 1200,
    analyzeMs: 950,
  },
  latestError: null,
  pending: false,
};

export const smokeAiStatusProcessing: AiStatusSnapshot = {
  meetingId: smokeProcessingMeeting.id,
  meetingStatus: "analyzing",
  latestJob: {
    id: "job-2",
    meeting_id: smokeProcessingMeeting.id,
    user_id: "user-1",
    job_type: "transcribe",
    status: "running",
    stage: "normalizing",
    provider_metadata: {
      transcription: {
        status: "normalizing",
        sourceModel: "deepgram:nova-2",
      },
      findings: {
        status: "queued",
      },
    },
    created_at: "2026-03-21T12:01:00.000Z",
    updated_at: "2026-03-21T12:02:00.000Z",
  },
  artifacts: [],
  transcriptAsset: null,
  rawAudioAsset: null,
  phase: "transcribing",
  transcriptReadyAt: null,
  findingsReadyAt: null,
  timings: null,
  latestError: null,
  pending: true,
};

export const smokeTranscriptDisabled: TranscriptAvailability = {
  status: "disabled",
  downloadEnabled: false,
  message: "Transcript downloads are disabled for this production launch. Findings remain available.",
  expiresAt: null,
};

export const smokeWorkspaceOverview: WorkspaceOverview = {
  google: smokeGoogleReconnectRecord,
  notion: smokeNotionNeedsDestinationRecord,
  meetings: [
    {
      ...smokeProcessingMeeting,
      status: "processing",
    },
    smokeReadyMeeting,
  ],
  latestAiJob: smokeAiStatusProcessing.latestJob,
  findingsByMeetingId: {
    [smokeReadyMeeting.id]: smokeReadyFindings,
  },
  exportsByMeetingId: {
    [smokeReadyMeeting.id]: smokeMeetingExports,
  },
  aiStatusByMeetingId: {
    [smokeReadyMeeting.id]: smokeAiStatusReady,
    [smokeProcessingMeeting.id]: smokeAiStatusProcessing,
  },
  providerStatus: {
    deepgramConfigured: true,
    openAiConfigured: true,
    aiCoreConfigured: true,
    huggingFaceConfigured: true,
    googleConfigured: true,
    googleRefreshConfigured: false,
    notionConfigured: true,
    transcriptDownloadsEnabled: false,
    transcriptStorageMode: "disabled",
    transcriptRetentionMinutes: 60,
    rawAssetRetentionHours: 24,
    aiPipelineMode: "railway_remote",
  },
};

export const smokeDashboardHomeData: DashboardHomeData = {
  google: smokeGoogleReconnectRecord,
  notion: smokeNotionNeedsDestinationRecord,
  providerStatus: smokeWorkspaceOverview.providerStatus,
};

export const smokeLibraryPageData: LibraryPageData = {
  query: "",
  limit: 20,
  nextCursor: "cursor-next-page",
  providerStatus: smokeWorkspaceOverview.providerStatus,
  cards: [
    {
      id: smokeProcessingMeeting.id,
      title: smokeProcessingMeeting.title,
      status: "processing",
      sourceType: smokeProcessingMeeting.source_type,
      originPlatform: smokeProcessingMeeting.origin_platform ?? "web",
      googleEventId: smokeProcessingMeeting.google_event_id ?? null,
      createdAt: smokeProcessingMeeting.created_at ?? null,
      endedAt: smokeProcessingMeeting.ended_at ?? null,
      scheduledStart: "2026-03-21T13:00:00.000Z",
      summaryShort: null,
      latestAiStage: "normalizing",
      latestError: null,
      phase: "transcribing",
      exportCount: 0,
      artifactCount: 0,
      transcriptExpiresAt: null,
      meetUrl: "https://meet.google.com/example",
      eventUrl: "https://calendar.google.com/event?eid=abc",
    },
    {
      id: smokeReadyMeeting.id,
      title: smokeReadyMeeting.title,
      status: "ready",
      sourceType: smokeReadyMeeting.source_type,
      originPlatform: smokeReadyMeeting.origin_platform ?? "web",
      googleEventId: smokeReadyMeeting.google_event_id ?? null,
      createdAt: smokeReadyMeeting.created_at ?? null,
      endedAt: smokeReadyMeeting.ended_at ?? null,
      scheduledStart: null,
      summaryShort: smokeReadyFindings.summary_short ?? null,
      latestAiStage: "completed",
      latestError: null,
      phase: "ready",
      exportCount: smokeMeetingExports.length,
      artifactCount: smokeMeetingArtifacts.length,
      transcriptExpiresAt: null,
      meetUrl: null,
      eventUrl: null,
    },
  ],
};
