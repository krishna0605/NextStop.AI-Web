import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { outputFolder: "playwright-report" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npx next start --hostname 127.0.0.1 --port 3100",
        url: `${baseURL}/smoke`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          ENABLE_SMOKE_ROUTES: "true",
          APP_URL: baseURL,
          NEXT_PUBLIC_APP_URL: baseURL,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key",
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key",
          NOTION_CLIENT_ID: process.env.NOTION_CLIENT_ID || "notion-client-id",
          NOTION_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET || "notion-client-secret",
          NOTION_OAUTH_STATE_SECRET: process.env.NOTION_OAUTH_STATE_SECRET || "notion-state-secret",
          RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
          RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "rzp_secret",
          RAZORPAY_PLAN_ID: process.env.RAZORPAY_PLAN_ID || "plan_test",
          RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "webhook_secret",
          TRANSCRIPT_STORAGE_MODE: process.env.TRANSCRIPT_STORAGE_MODE || "disabled",
        },
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
