const args = process.argv.slice(2);
const requireProductionObservability =
  args.includes("--production-observability") ||
  process.env.REQUIRE_PRODUCTION_OBSERVABILITY === "true";
const serviceOnly = args.includes("--service-only") || process.env.READINESS_SERVICE_ONLY === "true";
const requireHostedVerification =
  args.includes("--hosted-verification") ||
  process.env.REQUIRE_HOSTED_VERIFICATION === "true";
const requireLaunchCertification =
  args.includes("--launch-certification") ||
  process.env.REQUIRE_LAUNCH_CERTIFICATION === "true";
const target =
  args.find((arg) => !arg.startsWith("--")) ||
  process.env.READINESS_URL ||
  process.env.READINESS_BASE_URL;

if (!target) {
  console.error(
    "Usage: npm run test:readiness -- <base-url> [--service-only] [--hosted-verification] [--launch-certification] [--production-observability]"
  );
  process.exit(1);
}

function toReadinessUrl(value) {
  const url = new URL(value);
  if (url.pathname.replace(/\/$/, "") === "/api/health/readiness") {
    return url.toString();
  }
  return new URL("/api/health/readiness", url).toString();
}

const readinessUrl = toReadinessUrl(target);

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

  if (!payload || typeof payload !== "object") {
    throw new Error(`Readiness endpoint failed at ${readinessUrl}`);
  }

  const failures = [];
  const checks = Array.isArray(payload.checks) ? payload.checks : [];
  const productionEvidenceBlockerNames = new Set([
    "Hosted verification",
    "Launch certification",
    "Production observability",
  ]);
  const productionEvidenceChecks = Array.isArray(payload.productionEvidenceChecks)
    ? payload.productionEvidenceChecks
    : [];
  const blockingFailures = Array.isArray(payload.blockingFailures)
    ? payload.blockingFailures
    : [];
  const failingChecks = requiredPassingChecks.filter((name) => {
    const check = checks.find((entry) => entry?.name === name);
    return !check || check.status !== "pass";
  });

  if (failingChecks.length > 0) {
    failures.push(`Readiness checks failed: ${failingChecks.join(", ")}`);
  }

  if (payload.readiness?.transcriptStorageMode !== "disabled") {
    failures.push("Production transcript mode is not disabled.");
  }

  if (serviceOnly) {
    const unexpectedBlockingFailures = blockingFailures.filter(
      (entry) => !productionEvidenceBlockerNames.has(entry?.name)
    );

    if (unexpectedBlockingFailures.length > 0) {
      failures.push(
        `Readiness has non-evidence blockers: ${unexpectedBlockingFailures
          .map((entry) => entry?.name ?? "unknown")
          .join(", ")}`
      );
    }
  } else if (
    !requireProductionObservability &&
    !requireHostedVerification &&
    !requireLaunchCertification &&
    !response.ok
  ) {
    failures.push(`Readiness endpoint returned HTTP ${response.status}.`);
  }

  if (requireProductionObservability) {
    const observability = payload.aiCoreHealth?.observability;
    const productionObservabilityCheck = productionEvidenceChecks.find(
      (entry) => entry?.name === "Production observability"
    );
    const productionObservabilityFailure = blockingFailures.find(
      (entry) => entry?.name === "Production observability"
    );

    if (!observability || typeof observability !== "object") {
      failures.push("AI core observability payload is missing.");
    } else {
      if (observability.environment !== "production") {
        failures.push("AI core observability environment is not production.");
      }
      if (observability.sentryConfigured !== true) {
        failures.push("AI core Sentry observability is not configured.");
      }
      if (observability.otlpConfigured !== true) {
        failures.push("AI core OTLP observability is not configured.");
      }
    }

    if (productionObservabilityCheck?.status !== "pass") {
      failures.push("Production observability evidence check is not passing.");
    }

    if (productionObservabilityFailure) {
      failures.push("Production observability is still listed as a blocking failure.");
    }
  }

  if (requireHostedVerification) {
    const hostedVerification = payload.hostedVerification;
    const hostedVerificationCheck = productionEvidenceChecks.find(
      (entry) => entry?.name === "Hosted verification"
    );
    const hostedVerificationFailure = blockingFailures.find(
      (entry) => entry?.name === "Hosted verification"
    );

    if (!hostedVerification || typeof hostedVerification !== "object") {
      failures.push("Hosted verification payload is missing.");
    } else if (hostedVerification.lastHostedVerificationStatus !== "pass") {
      failures.push("Hosted verification has not passed.");
    }

    if (hostedVerificationCheck?.status !== "pass") {
      failures.push("Hosted verification evidence check is not passing.");
    }

    if (hostedVerificationFailure) {
      failures.push("Hosted verification is still listed as a blocking failure.");
    }
  }

  if (requireLaunchCertification) {
    const launchCertification = payload.launchCertification;
    const launchCertificationCheck = productionEvidenceChecks.find(
      (entry) => entry?.name === "Launch certification"
    );
    const launchCertificationFailure = blockingFailures.find(
      (entry) => entry?.name === "Launch certification"
    );

    if (!response.ok || response.status !== 200) {
      failures.push(`Readiness endpoint did not return HTTP 200 for launch certification.`);
    }

    if (payload.launchDecision !== "ready") {
      failures.push("Readiness launchDecision is not ready.");
    }

    if (!launchCertification || typeof launchCertification !== "object") {
      failures.push("Launch certification payload is missing.");
    } else {
      if (launchCertification.lastLaunchCertificationStatus !== "certified") {
        failures.push("Launch certification is not certified.");
      }
      if (launchCertification.validationGreen !== true) {
        failures.push("Launch certification validationGreen is not true.");
      }
      if (launchCertification.hostedVerificationPassed !== true) {
        failures.push("Launch certification hostedVerificationPassed is not true.");
      }
      if (launchCertification.operationalProofComplete !== true) {
        failures.push("Launch certification operationalProofComplete is not true.");
      }
    }

    if (launchCertificationCheck?.status !== "pass") {
      failures.push("Launch certification evidence check is not passing.");
    }

    if (launchCertificationFailure) {
      failures.push("Launch certification is still listed as a blocking failure.");
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n"));
  }

  const modes = [
    serviceOnly ? "service precheck" : null,
    requireHostedVerification ? "hosted verification proof" : null,
    requireLaunchCertification ? "launch certification proof" : null,
    requireProductionObservability ? "production observability proof" : null,
  ].filter(Boolean);
  const suffix =
    modes.length > 0
      ? ` with ${modes.join(", ")}; launchDecision=${payload.launchDecision ?? "unknown"}`
      : "";
  console.log(`Readiness checks passed for ${readinessUrl}${suffix}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
