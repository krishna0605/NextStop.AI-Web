// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { WorkspaceOps } from "@/components/workspace/WorkspaceOps";
import { smokeOpsReadinessData } from "@tests/fixtures/workspace";

describe("WorkspaceOps", () => {
  it("renders worker health, safe summaries, and external observability links", () => {
    render(<WorkspaceOps data={smokeOpsReadinessData} />);

    expect(screen.getByText("Production readiness")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText(/nextstop-ai-jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/Operational summaries/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Grafana Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Sentry Issues/i)).toBeInTheDocument();
    expect(screen.getByText(/Sensitive route protection/i)).toBeInTheDocument();
    expect(screen.getByText(/Rate-limit denials/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Hosted verification/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Launch certification/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Capture runtime/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent finalize and capture activity/i)).toBeInTheDocument();
  });
});
