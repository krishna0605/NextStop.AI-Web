// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { WorkspaceOps } from "@/components/workspace/WorkspaceOps";
import { smokeOpsReadinessData } from "@tests/fixtures/workspace";

describe("WorkspaceOps", () => {
  it("renders worker health and recent failure summaries", () => {
    render(<WorkspaceOps data={smokeOpsReadinessData} />);

    expect(screen.getByText("Production readiness")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText(/Deepgram returned an empty transcript/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF generation timed out/i)).toBeInTheDocument();
    expect(screen.getByText(/nextstop-ai-jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/Fallback findings visibility/i)).toBeInTheDocument();
    expect(screen.getByText(/Go To Market Sync/i)).toBeInTheDocument();
    expect(screen.getByText(/Sensitive route protection/i)).toBeInTheDocument();
    expect(screen.getByText(/Rate-limit denials/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Hosted verification/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Launch certification/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Capture runtime/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent finalize and capture activity/i)).toBeInTheDocument();
  });
});
