// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { MeetingReview } from "@/components/workspace/MeetingReview";
import {
  smokeMeetingExports,
  smokeNotionNeedsDestinationRecord,
  smokeReadyFindings,
  smokeReadyMeeting,
  smokeTranscriptDisabled,
} from "@tests/fixtures/workspace";

describe("MeetingReview", () => {
  it("renders the production transcript-disabled posture", () => {
    render(
      <MeetingReview
        meeting={smokeReadyMeeting}
        findings={smokeReadyFindings}
        exports={smokeMeetingExports}
        notion={smokeNotionNeedsDestinationRecord}
        transcriptAvailability={smokeTranscriptDisabled}
      />
    );

    expect(screen.getByText("Transcript unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Transcript downloads are disabled for this production launch/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/only findings are stored/i)).toBeInTheDocument();
  });
});
