const args = process.argv.slice(2);
const baseUrl =
  args.find((arg) => !arg.startsWith("--")) ||
  process.env.PRODUCTION_BASE_URL ||
  process.env.BASE_URL;
const backendHealthUrl =
  args.find((arg) => arg.startsWith("--backend-health-url="))?.split("=")[1] ||
  process.env.BACKEND_HEALTH_URL;
const outputPath =
  args.find((arg) => arg.startsWith("--output="))?.split("=")[1] ||
  "production-security-verification.json";

if (!baseUrl) {
  console.error(
    "Usage: node scripts/verify-production-security.mjs <base-url> [--backend-health-url=<url>] [--output=<path>]"
  );
  process.exit(1);
}

const requiredHeaders = [
  "content-security-policy",
  "content-security-policy-report-only",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "strict-transport-security",
];
const expectedEvidenceBlockers = new Set([
  "Hosted verification",
  "Launch certification",
  "Production observability",
]);

function toUrl(path) {
  return new URL(path, baseUrl).toString();
}

function unique(values) {
  return [...new Set(values)];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const text = await response.text();
  return { response, text };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function extractScriptSources(html) {
  const sources = [];
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = scriptPattern.exec(html))) {
    sources.push(match[1]);
  }

  return unique(
    sources
      .filter((src) => src.includes("/_next/static/") && src.endsWith(".js"))
      .map((src) => new URL(src, baseUrl).toString())
  );
}

async function checkHeaders(homeResponse) {
  const missing = requiredHeaders.filter((header) => !homeResponse.headers.get(header));

  return {
    ok: missing.length === 0,
    missing,
    values: Object.fromEntries(
      requiredHeaders.map((header) => [header, homeResponse.headers.get(header) ?? null])
    ),
  };
}

async function checkReadiness() {
  const { response, payload } = await fetchJson(toUrl("/api/health/readiness"));
  const blockingFailures = Array.isArray(payload?.blockingFailures)
    ? payload.blockingFailures
    : [];
  const unexpectedBlockers = blockingFailures.filter(
    (failure) => !expectedEvidenceBlockers.has(String(failure?.name ?? ""))
  );

  return {
    ok: Boolean(payload) && [200, 503].includes(response.status) && unexpectedBlockers.length === 0,
    status: response.status,
    launchDecision: payload?.launchDecision ?? null,
    blockingFailures,
    unexpectedBlockers,
  };
}

async function checkSourceMaps(scriptSources) {
  const checked = [];
  const exposed = [];

  for (const source of scriptSources.slice(0, 12)) {
    const mapUrl = `${source}.map`;
    const response = await fetch(mapUrl, { method: "GET" });
    const result = {
      script: source,
      sourceMap: mapUrl,
      status: response.status,
      exposed: response.ok,
    };
    checked.push(result);

    if (response.ok) {
      exposed.push(result);
    }
  }

  return {
    ok: exposed.length === 0,
    checked,
    exposed,
    skipped: scriptSources.length === 0,
  };
}

async function checkBackendHealth() {
  if (!backendHealthUrl) {
    return {
      ok: true,
      skipped: true,
      reason: "BACKEND_HEALTH_URL was not provided.",
    };
  }

  const { response, payload } = await fetchJson(backendHealthUrl);
  const failures = [];

  if (!response.ok) failures.push(`Backend health returned HTTP ${response.status}.`);
  if (payload?.workerReady !== true) failures.push("workerReady is not true.");
  if (payload?.directExecution !== true) failures.push("directExecution is not true.");
  if (payload?.workerStale === true) failures.push("workerStale is true.");
  if (payload?.cleanup?.lastCleanupError) failures.push("cleanup reported an error.");

  return {
    ok: failures.length === 0,
    skipped: false,
    status: response.status,
    failures,
    observability: payload?.observability ?? null,
    hostedVerification: payload?.hostedVerification ?? null,
    launchCertification: payload?.launchCertification ?? null,
  };
}

async function main() {
  const { response: homeResponse, text: homeHtml } = await fetchText(toUrl("/"));
  const headers = await checkHeaders(homeResponse);
  const readiness = await checkReadiness();
  const scriptSources = extractScriptSources(homeHtml);
  const sourceMaps = await checkSourceMaps(scriptSources);
  const backendHealth = await checkBackendHealth();
  const failures = [];

  if (!homeResponse.ok) failures.push(`Home page returned HTTP ${homeResponse.status}.`);
  if (!headers.ok) failures.push(`Missing security headers: ${headers.missing.join(", ")}`);
  if (!readiness.ok) {
    failures.push(
      `Readiness failed security precheck; unexpected blockers: ${readiness.unexpectedBlockers
        .map((entry) => entry?.name ?? "unknown")
        .join(", ")}`
    );
  }
  if (!sourceMaps.ok) {
    failures.push(
      `Public source maps are exposed: ${sourceMaps.exposed
        .map((entry) => entry.sourceMap)
        .join(", ")}`
    );
  }
  if (!backendHealth.ok) {
    failures.push(`Backend health failed: ${backendHealth.failures.join(", ")}`);
  }

  const result = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    baseUrl,
    backendHealthUrl: backendHealthUrl ?? null,
    home: {
      status: homeResponse.status,
      ok: homeResponse.ok,
    },
    headers,
    readiness,
    sourceMaps,
    backendHealth,
    failures,
  };

  await import("node:fs/promises").then((fs) =>
    fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8")
  );

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`Production security verification passed for ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
