// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { MeetingReview } from "@/components/workspace/MeetingReview";
import {
  smokeAiStatusReady,
  smokeMeetingArtifacts,
  smokeMeetingExports,
  smokeNotionNeedsDestinationRecord,
  smokeReadyFindings,
  smokeReadyMeeting,
  smokeTranscriptDisabled,
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
    expect(screen.queryByText(/Transcription pipeline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Artifacts$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Regenerate summary/i)).not.toBeInTheDocument();
  });
});
