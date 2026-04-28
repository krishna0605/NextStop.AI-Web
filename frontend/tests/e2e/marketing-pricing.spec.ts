import { expect, test } from "@playwright/test";

test("homepage hero, footer, and legal links are production-ready", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /NextStop\.ai/ })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Pricing" })).toHaveAttribute(
    "href",
    "/pricing"
  );
  await expect(page.getByRole("navigation").getByRole("link", { name: "Security" })).toHaveAttribute(
    "href",
    "/security"
  );
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "/privacy"
  );
  await expect(page.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
    "href",
    "/terms"
  );
  await expect(page.getByRole("link", { name: "Cookie Policy" })).toHaveAttribute(
    "href",
    "/cookies"
  );
  await expect(page.getByRole("link", { name: "View Plans" })).toHaveAttribute(
    "href",
    "/pricing"
  );
  await expect(page.getByRole("link", { name: "Open Web Dashboard" })).toHaveAttribute(
    "href",
    "/dashboard"
  );
});

test("pricing page exposes centralized plan claims and legal surface", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: /Choose the workflow/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Starter", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pro Workflow", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Team", exact: true })).toBeVisible();
  await expect(page.getByText("Desktop local recording")).toBeVisible();
  await expect(page.getByText("Full feature comparison")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Web App" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download Desktop App" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Contact Sales" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Trust & Security/ })).toHaveAttribute(
    "href",
    "/security"
  );
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cookie Policy" })).toBeVisible();
});

test("legal policy routes render on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const [path, heading] of [
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Service"],
    ["/cookies", "Cookie Policy"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByText("Last updated: April 28, 2026")).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms of Service" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cookie Policy" })).toBeVisible();
  }
});

test("homepage and pricing anchors remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("link", { name: "View Plans" })).toHaveAttribute(
    "href",
    "/pricing"
  );
  await expect(page.getByRole("link", { name: "Privacy Policy" })).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByText("Pricing questions")).toBeVisible();
  await expect(page.getByText("Can I use NextStop for free?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cookie Policy" })).toBeVisible();
});
