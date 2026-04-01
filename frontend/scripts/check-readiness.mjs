const target = process.argv[2] || process.env.READINESS_BASE_URL;

if (!target) {
  console.error("Usage: npm run test:readiness -- <base-url>");
  process.exit(1);
}

const readinessUrl = new URL("/api/health/readiness", target).toString();

const requiredPassingChecks = [
  "Supabase public auth",
  "Supabase admin",
  "Notion workspace broker",
  "Razorpay",
  "Transcript policy",
  "AI worker",
];

async function main() {
  const response = await fetch(readinessUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error(`Readiness endpoint failed at ${readinessUrl}`);
  }

  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  const failingChecks = requiredPassingChecks.filter((name) => {
    const check = checks.find((entry) => entry?.name === name);
    return !check || check.status !== "pass";
  });

  if (failingChecks.length > 0) {
    throw new Error(`Readiness checks failed: ${failingChecks.join(", ")}`);
  }

  if (payload.readiness?.transcriptStorageMode !== "disabled") {
    throw new Error("Production transcript mode is not disabled.");
  }

  console.log(`Readiness checks passed for ${readinessUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
