import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "nextstop-workspace-capture-session",
      JSON.stringify({
        version: 1,
        captureState: "failed",
        elapsedSeconds: 164,
        tabShared: false,
        micLive: false,
        error: "Unable to finalize the meeting session.",
        notice: "We kept the recorded audio in this browser tab. Retry finalize or discard the failed session.",
        activeMeeting: { id: "meeting-failed-1", title: "Candidate Interview" },
        pendingMeeting: null,
      })
    );
  });
});

test("renders smoke workspace states with deterministic fixtures", async ({ page }) => {
  await page.route("**/api/workspace/notion/destinations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        destinations: [
          { id: "page-1", name: "Product Notes", type: "page" },
          { id: "db-1", name: "Hiring Tracker", type: "database" },
        ],
      }),
    });
  });

  await page.route("**/api/workspace/island/context", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        googleConnected: true,
        notionConnected: true,
        latestCompletedMeeting: { id: "meeting-ready-1", title: "Candidate Interview" },
        latestScheduledGoogleMeeting: null,
        activeMeeting: null,
      }),
    });
  });

  await page.goto("/smoke");

  await expect(page.getByRole("heading", { name: "Workspace smoke states" })).toBeVisible();
  await expect(page.getByText("Google needs to be reconnected")).toBeVisible();
  await expect(page.getByText("Choose where findings will land")).toBeVisible();
  await expect(
    page.getByLabel("Library state").getByRole("heading", { name: "Candidate Interview" })
  ).toBeVisible();
  await expect(page.getByText("Transcript downloads are disabled for this production launch. Findings remain available.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Discard" })).toBeVisible();
});
