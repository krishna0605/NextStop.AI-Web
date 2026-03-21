// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";

import { WorkspaceLibrary } from "@/components/workspace/WorkspaceLibrary";
import { smokeWorkspaceOverview } from "@tests/fixtures/workspace";

describe("WorkspaceLibrary", () => {
  it("renders seeded meetings across ready and processing states", () => {
    render(<WorkspaceLibrary overview={smokeWorkspaceOverview} />);

    expect(screen.getByText("Candidate Interview")).toBeInTheDocument();
    expect(screen.getByText("Product Review")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
  });
});
