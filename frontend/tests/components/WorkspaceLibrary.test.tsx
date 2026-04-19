// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import { WorkspaceCaptureProvider } from "@/components/workspace/WorkspaceCaptureIsland";
import { WorkspaceLibrary } from "@/components/workspace/WorkspaceLibrary";
import { smokeLibraryPageData } from "@tests/fixtures/workspace";

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
        <WorkspaceLibrary data={smokeLibraryPageData} />
      </WorkspaceCaptureProvider>
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());

    expect(screen.getByText("Candidate Interview")).toBeInTheDocument();
    expect(screen.getByText("Product Review")).toBeInTheDocument();
    expect(screen.getByText("Go To Market Sync")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("Fallback mode")).toBeInTheDocument();
    expect(screen.getByText("normalizing")).toBeInTheDocument();
    expect(screen.getByText("Design Review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download transcript/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^cancel$/i }).length).toBeGreaterThan(0);
  });
});
