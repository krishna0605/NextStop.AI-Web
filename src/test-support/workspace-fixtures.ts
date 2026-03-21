import type {
  IntegrationRecord,
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

export const smokeTranscriptDisabled: TranscriptAvailability = {
  status: "disabled",
  downloadEnabled: false,
  message: "Transcript downloads are disabled for this production launch. Findings remain available.",
  expiresAt: null,
};

export const smokeWorkspaceOverview: WorkspaceOverview = {
  google: smokeGoogleReconnectRecord,
  notion: smokeNotionNeedsDestinationRecord,
  meetings: [smokeProcessingMeeting, smokeReadyMeeting],
  findingsByMeetingId: {
    [smokeReadyMeeting.id]: smokeReadyFindings,
  },
  exportsByMeetingId: {
    [smokeReadyMeeting.id]: smokeMeetingExports,
  },
  providerStatus: {
    deepgramConfigured: true,
    openAiConfigured: true,
    googleConfigured: true,
    googleRefreshConfigured: false,
    notionConfigured: true,
    transcriptDownloadsEnabled: false,
    transcriptStorageMode: "disabled",
  },
};
