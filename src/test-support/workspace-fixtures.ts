import type {
  AiStatusSnapshot,
  IntegrationRecord,
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
    job_type: "finalize",
    status: "ready",
    stage: "completed",
    created_at: "2026-03-21T11:46:00.000Z",
    updated_at: "2026-03-21T11:47:00.000Z",
  },
  artifacts: smokeMeetingArtifacts,
  transcriptAsset: null,
  rawAudioAsset: null,
  pending: false,
};

export const smokeAiStatusProcessing: AiStatusSnapshot = {
  meetingId: smokeProcessingMeeting.id,
  meetingStatus: "analyzing",
  latestJob: {
    id: "job-2",
    meeting_id: smokeProcessingMeeting.id,
    user_id: "user-1",
    job_type: "finalize",
    status: "running",
    stage: "extracting",
    created_at: "2026-03-21T12:01:00.000Z",
    updated_at: "2026-03-21T12:02:00.000Z",
  },
  artifacts: [],
  transcriptAsset: null,
  rawAudioAsset: null,
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
      status: "analyzing",
    },
    smokeReadyMeeting,
  ],
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
