import { expect, test } from "@playwright/test";

test("homepage and login page load in deployed environments", async ({ page, request }) => {
  const home = await page.goto("/");
  expect(home?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/NextStop/i);

  const login = await page.goto("/login");
  expect(login?.ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

  const readiness = await request.get("/api/health/readiness");
  expect([200, 503]).toContain(readiness.status());

  const payload = await readiness.json();
  const expectedEvidenceBlockers = new Set([
    "Hosted verification",
    "Launch certification",
    "Production observability",
  ]);
  const blockingFailures = Array.isArray(payload.blockingFailures)
    ? payload.blockingFailures
    : [];
  const unexpectedBlockers = blockingFailures.filter(
    (failure: { name?: unknown }) =>
      !expectedEvidenceBlockers.has(String(failure?.name ?? ""))
  );

  expect(unexpectedBlockers).toEqual([]);
});
