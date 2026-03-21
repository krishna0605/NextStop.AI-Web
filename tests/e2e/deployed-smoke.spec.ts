import { expect, test } from "@playwright/test";

test("homepage and login page load in deployed environments", async ({ page, request }) => {
  const home = await page.goto("/");
  expect(home?.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/NextStop/i);

  const login = await page.goto("/login");
  expect(login?.ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();

  const readiness = await request.get("/api/health/readiness");
  expect(readiness.ok()).toBeTruthy();
});
