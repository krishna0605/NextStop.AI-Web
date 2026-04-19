// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { MeetingReview } from "@/components/workspace/MeetingReview";
import {
  smokeAiStatusDegraded,
  smokeAiStatusReady,
  smokeAiStatusTranscriptReady,
  smokeDegradedFindings,
  smokeDegradedMeeting,
  smokeMeetingArtifacts,
  smokeMeetingExports,
  smokeNotionNeedsDestinationRecord,
  smokeReadyFindings,
  smokeReadyMeeting,
  smokeTranscriptAvailable,
  smokeTranscriptDisabled,
  smokeTranscriptNotReady,
  smokeTranscriptReadyMeeting,
  smokeWorkspaceOverview,
} from "@tests/fixtures/workspace";

describe("MeetingReview", () => {
  it("renders the simplified review layout with transcript actions", () => {
    render(
      <MeetingReview
        meeting={smokeReadyMeeting}
        findings={smokeReadyFindings}
        artifacts={smokeMeetingArtifacts}
        aiStatus={smokeAiStatusReady}
        exports={smokeMeetingExports}
        notion={smokeNotionNeedsDestinationRecord}
        transcriptAvailability={smokeTranscriptDisabled}
        providerStatus={smokeWorkspaceOverview.providerStatus}
      />
    );

    expect(screen.getByText("Transcript unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Transcript downloads are disabled for this production launch/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/shared outputs, transcript-free cloud workspace/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Primary model path").length).toBeGreaterThan(0);
    expect(screen.getByText(/Export-ready with transcript-limited policy/i)).toBeInTheDocument();
    expect(screen.queryByText(/Transcription pipeline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Artifacts$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Regenerate summary/i)).not.toBeInTheDocument();
  });

  it("explains degraded fallback mode when findings were generated without the primary model path", () => {
    render(
      <MeetingReview
        meeting={smokeDegradedMeeting}
        findings={smokeDegradedFindings}
        artifacts={[]}
        aiStatus={smokeAiStatusDegraded}
        exports={[]}
        notion={smokeNotionNeedsDestinationRecord}
        transcriptAvailability={smokeTranscriptAvailable}
        providerStatus={{
          ...smokeWorkspaceOverview.providerStatus,
          transcriptDownloadsEnabled: true,
          transcriptStorageMode: "memory",
        }}
      />
    );

    expect(screen.getAllByText("Degraded").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fallback mode").length).toBeGreaterThan(0);
    expect(screen.getByText(/Why this state\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Primary model path unavailable/i)).toBeInTheDocument();
    expect(screen.getAllByText(/openai request timed out/i).length).toBeGreaterThan(0);
  });

  it("shows transcript processing and cancel controls while findings are still pending", () => {
    render(
      <MeetingReview
        meeting={smokeTranscriptReadyMeeting}
        findings={null}
        artifacts={[]}
        aiStatus={smokeAiStatusTranscriptReady}
        exports={[]}
        notion={smokeNotionNeedsDestinationRecord}
        transcriptAvailability={smokeTranscriptNotReady}
        providerStatus={smokeWorkspaceOverview.providerStatus}
      />
    );

    expect(screen.getByText("Transcript processing")).toBeInTheDocument();
    expect(
      screen.getByText(/Temporary transcript will appear here as soon as transcription completes/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("Cancel processing").length).toBeGreaterThan(0);
  });
});
