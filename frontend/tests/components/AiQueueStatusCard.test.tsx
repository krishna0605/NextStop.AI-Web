// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { AiQueueStatusCard } from "@/components/workspace/AiQueueStatusCard";
import { smokeDashboardHomeData } from "@tests/fixtures/workspace";

describe("AiQueueStatusCard", () => {
  it("shows queue counts and an ops link", () => {
    render(<AiQueueStatusCard overview={smokeDashboardHomeData} />);

    expect(screen.getByLabelText("AI processing status")).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Ops" })).toHaveAttribute(
      "href",
      "/dashboard/ops"
    );
  });

  it("warns when the AI core is not configured", () => {
    render(
      <AiQueueStatusCard
        overview={{
          ...smokeDashboardHomeData,
          providerStatus: {
            ...smokeDashboardHomeData.providerStatus,
            aiCoreConfigured: false,
          },
        }}
      />
    );

    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText(/AI core health is not configured/i)).toBeInTheDocument();
  });
});
