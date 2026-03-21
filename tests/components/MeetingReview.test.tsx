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
  it("renders the production transcript-disabled posture", () => {
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
    expect(screen.getByText(/ephemeral transcript, durable artifact bundle/i)).toBeInTheDocument();
    expect(screen.getByText(/Transcription pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Transcription: ready/i)).toBeInTheDocument();
  });
});
