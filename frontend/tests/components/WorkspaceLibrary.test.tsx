// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { WorkspaceCaptureProvider } from "@/components/workspace/WorkspaceCaptureIsland";
import { WorkspaceLibrary } from "@/components/workspace/WorkspaceLibrary";
import { smokeWorkspaceOverview } from "@tests/fixtures/workspace";

describe("WorkspaceLibrary", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        googleConnected: true,
        notionConnected: true,
        latestCompletedMeeting: null,
        latestScheduledGoogleMeeting: null,
        activeMeeting: null,
      }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders seeded meetings across ready and processing states", async () => {
    render(
      <WorkspaceCaptureProvider>
        <WorkspaceLibrary overview={smokeWorkspaceOverview} />
      </WorkspaceCaptureProvider>
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    expect(screen.getByText("Candidate Interview")).toBeInTheDocument();
    expect(screen.getByText("Product Review")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("normalizing")).toBeInTheDocument();
  });
});
