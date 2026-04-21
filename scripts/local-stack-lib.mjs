import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");
export const composeFiles = [
  "docker-compose.local.yml",
  "docker-compose.local.dev.yml",
];
export const observabilityComposeFile = "docker-compose.local.observability.yml";
export const frontendEnvFile = path.join(repoRoot, "frontend", ".env.local");
export const backendEnvFile = path.join(repoRoot, "backend", ".env.local");
export const stackEnvFile = path.join(repoRoot, ".env.local.stack");
export const localAccessFile = path.join(repoRoot, "local-stack-access.txt");
const defaultStackEnv = {
  LOCAL_FRONTEND_PORT: "3000",
  LOCAL_BACKEND_PORT: "8080",
  LOCAL_REDIS_PORT: "6379",
  LOCAL_PROMETHEUS_PORT: "9090",
  LOCAL_GRAFANA_PORT: "3002",
  LOCAL_LOKI_PORT: "3100",
  LOCAL_TEMPO_PORT: "3200",
  LOCAL_ALLOY_PORT: "12345",
  LOCAL_OTLP_HTTP_PORT: "4318",
};

export function composeArgs(includeObservability = false) {
  const files = [...composeFiles];
  if (includeObservability) {
    files.push(observabilityComposeFile);
  }

  return files.flatMap((file) => ["-f", file]);
}

export function relPath(target) {
  return path.relative(repoRoot, target) || ".";
}

export async function fileExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function loadStackEnv() {
  const values = { ...defaultStackEnv };

  if (await fileExists(stackEnvFile)) {
    const overrides = await readEnvFile(stackEnvFile);
    for (const [key, value] of overrides.entries()) {
      values[key] = value;
    }
  }

  return values;
}

export async function readEnvFile(target) {
  const raw = await fs.readFile(target, "utf8");
  const entries = new Map();

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    entries.set(key, value);
  }

  return entries;
}

function isPlaceholder(value) {
  if (!value) {
    return true;
  }

  const normalized = value.toLowerCase();
  return (
    normalized.includes("replace-with") ||
    normalized.includes("your-project") ||
    normalized.includes("your-") ||
    normalized === "changeme"
  );
}

async function resolveHostnameOverHttps(hostname) {
  const response = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`
  );

  if (!response.ok) {
    throw new Error(`dns.google returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  const answers = Array.isArray(payload.Answer) ? payload.Answer : [];

  if (payload.Status !== 0 || answers.length === 0) {
    throw new Error(`Hostname lookup failed with status ${payload.Status ?? "unknown"}`);
  }

  return answers;
}

export async function validateLocalEnv() {
  const failures = [];
  const warnings = [];

  for (const envFile of [frontendEnvFile, backendEnvFile]) {
    if (!(await fileExists(envFile))) {
      failures.push(`Missing required env file: ${relPath(envFile)}`);
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures, warnings };
  }

  const [frontendEnv, backendEnv] = await Promise.all([
    readEnvFile(frontendEnvFile),
    readEnvFile(backendEnvFile),
  ]);

  const requiredFrontend = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  const requiredBackend = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "DEEPGRAM_API_KEY",
  ];

  for (const key of requiredFrontend) {
    const value = frontendEnv.get(key);
    if (isPlaceholder(value)) {
      failures.push(`frontend/.env.local must define a real value for ${key}`);
    }
  }

  for (const key of requiredBackend) {
    const value = backendEnv.get(key);
    if (isPlaceholder(value)) {
      failures.push(`backend/.env.local must define a real value for ${key}`);
    }
  }

  const notionClientId = backendEnv.get("NOTION_CLIENT_ID");
  const razorpayKeyId = backendEnv.get("RAZORPAY_KEY_ID");
  if (isPlaceholder(notionClientId)) {
    warnings.push("Notion OAuth is not fully configured in backend/.env.local.");
  }
  if (isPlaceholder(razorpayKeyId)) {
    warnings.push("Razorpay is not fully configured in backend/.env.local.");
  }

  const supabaseUrl = frontendEnv.get("NEXT_PUBLIC_SUPABASE_URL");
  if (supabaseUrl && !isPlaceholder(supabaseUrl)) {
    try {
      const hostname = new URL(supabaseUrl).hostname;
      await resolveHostnameOverHttps(hostname);
    } catch (error) {
      failures.push(
        `frontend/.env.local has an invalid NEXT_PUBLIC_SUPABASE_URL. ${
          error instanceof Error ? error.message : "Hostname validation failed."
        }`
      );
    }
  }

  return { ok: failures.length === 0, failures, warnings };
}

export async function runCommand(command, args, options = {}) {
  const {
    cwd = repoRoot,
    capture = false,
    allowFailure = false,
    env = process.env,
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    let stdout = "";
    let stderr = "";

    if (capture) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !allowFailure) {
        const error = new Error(
          capture
            ? stderr.trim() || stdout.trim() || `${command} exited with code ${code}`
            : `${command} exited with code ${code}`
        );
        error.code = code;
        reject(error);
        return;
      }

      resolve({
        code: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

export async function ensureDockerAvailable() {
  try {
    await runCommand("docker", ["info"], { capture: true });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Docker Desktop or the Docker engine is unavailable.",
    };
  }
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "Request did not complete.";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown HTTP error";
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(lastError);
}

async function waitForTcp(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = `Unable to connect to ${host}:${port}`;

  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect({ host, port });
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error(`Timed out connecting to ${host}:${port}`));
        }, 2000);

        socket.once("connect", () => {
          clearTimeout(timeout);
          socket.end();
          resolve();
        });

        socket.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      return true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error(lastError);
}

export async function getComposeStatus(includeObservability = false) {
  const stackEnv = await loadStackEnv();
  const result = await runCommand(
    "docker",
    ["compose", ...composeArgs(includeObservability), "ps", "--format", "json"],
    { capture: true, allowFailure: true, env: { ...process.env, ...stackEnv } }
  );

  if (!result.stdout) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function runHealthChecks(options = {}) {
  const {
    includeObservability = false,
    wait = false,
    timeoutMs = 90_000,
  } = options;

  const failures = [];
  const warnings = [];
  const services = [];
  const stackEnv = await loadStackEnv();

  const envCheck = await validateLocalEnv();
  failures.push(...envCheck.failures);
  warnings.push(...envCheck.warnings);

  const httpChecks = [
    {
      name: "frontend",
      url: `http://localhost:${stackEnv.LOCAL_FRONTEND_PORT}`,
    },
    {
      name: "backend-api",
      url: `http://localhost:${stackEnv.LOCAL_BACKEND_PORT}/health`,
    },
  ];

  const tcpChecks = [
    {
      name: "redis",
      host: "127.0.0.1",
      port: Number(stackEnv.LOCAL_REDIS_PORT),
    },
  ];

  for (const check of httpChecks) {
    try {
      if (wait) {
        await waitForHttp(check.url, timeoutMs);
      } else {
        const response = await fetch(check.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }
      services.push({ name: check.name, status: "ready", detail: check.url });
    } catch (error) {
      failures.push(
        `${check.name} failed readiness check (${check.url}): ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      services.push({ name: check.name, status: "failed", detail: check.url });
    }
  }

  for (const check of tcpChecks) {
    try {
      if (wait) {
        await waitForTcp(check.host, check.port, timeoutMs);
      } else {
        await waitForTcp(check.host, check.port, 2_000);
      }
      services.push({
        name: check.name,
        status: "ready",
        detail: `${check.host}:${check.port}`,
      });
    } catch (error) {
      failures.push(
        `${check.name} failed readiness check (${check.host}:${check.port}): ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      services.push({
        name: check.name,
        status: "failed",
        detail: `${check.host}:${check.port}`,
      });
    }
  }

  let composeServices = [];
  try {
    composeServices = await getComposeStatus(includeObservability);
  } catch (error) {
    warnings.push(
      `Unable to inspect Docker Compose service status: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }

  for (const serviceName of ["backend-worker", "backend-cleanup"]) {
    const service = composeServices.find((item) => item.Service === serviceName);
    if (!service || service.State !== "running") {
      failures.push(`${serviceName} is not running in the local compose project.`);
      services.push({ name: serviceName, status: "failed", detail: "docker compose status" });
    } else {
      services.push({ name: serviceName, status: "ready", detail: service.State });
    }
  }

  if (includeObservability) {
    const observabilityChecks = [
      {
        name: "prometheus",
        url: `http://localhost:${stackEnv.LOCAL_PROMETHEUS_PORT}/-/ready`,
      },
      {
        name: "grafana",
        url: `http://localhost:${stackEnv.LOCAL_GRAFANA_PORT}/api/health`,
      },
      {
        name: "loki",
        url: `http://localhost:${stackEnv.LOCAL_LOKI_PORT}/ready`,
      },
      {
        name: "tempo",
        url: `http://localhost:${stackEnv.LOCAL_TEMPO_PORT}/ready`,
      },
      {
        name: "alloy",
        url: `http://localhost:${stackEnv.LOCAL_ALLOY_PORT}/-/ready`,
      },
    ];

    for (const check of observabilityChecks) {
      try {
        if (wait) {
          await waitForHttp(check.url, timeoutMs);
        } else {
          const response = await fetch(check.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
        }
        services.push({ name: check.name, status: "ready", detail: check.url });
      } catch (error) {
        failures.push(
          `${check.name} failed readiness check (${check.url}): ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        services.push({ name: check.name, status: "failed", detail: check.url });
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    services,
    stackEnv,
  };
}

function buildLocalAccessSummary(result, includeObservability = false) {
  const stackEnv = result.stackEnv ?? defaultStackEnv;
  const lines = [
    "NextStop local stack access",
    "==========================",
    "",
    "Core services",
    "-------------",
    `Frontend: http://localhost:${stackEnv.LOCAL_FRONTEND_PORT}`,
    `Backend API: http://localhost:${stackEnv.LOCAL_BACKEND_PORT}`,
    `Backend health: http://localhost:${stackEnv.LOCAL_BACKEND_PORT}/health`,
    `Backend metrics: http://localhost:${stackEnv.LOCAL_BACKEND_PORT}/metrics`,
    `Redis: localhost:${stackEnv.LOCAL_REDIS_PORT}`,
    "",
    "Observability services",
    "----------------------",
  ];

  if (includeObservability) {
    lines.push(
      `Prometheus: http://localhost:${stackEnv.LOCAL_PROMETHEUS_PORT}`,
      `Grafana: http://localhost:${stackEnv.LOCAL_GRAFANA_PORT}`,
      "Grafana username: admin",
      "Grafana password: admin",
      `Loki: http://localhost:${stackEnv.LOCAL_LOKI_PORT}`,
      `Tempo: http://localhost:${stackEnv.LOCAL_TEMPO_PORT}`,
      `Alloy: http://localhost:${stackEnv.LOCAL_ALLOY_PORT}`,
      `OTLP HTTP receiver: http://localhost:${stackEnv.LOCAL_OTLP_HTTP_PORT}`,
      ""
    );
  } else {
    lines.push(
      "Observability services are available when you start the stack with `npm run up:obs`.",
      "Prometheus, Grafana, Loki, Tempo, Alloy, and OTLP will then appear on their local ports.",
      ""
    );
  }

  lines.push(
    "Hosted dependencies",
    "-------------------",
    "Supabase, OpenAI, Deepgram, Notion OAuth, and Razorpay stay hosted and use your local env files.",
    "",
    "Notes",
    "-----",
    "This file is local-only and ignored by Git.",
    "Do not store real production secrets here.",
    ""
  );

  return `${lines.join("\n")}\n`;
}

export async function writeLocalAccessSummary(result, includeObservability = false) {
  const contents = buildLocalAccessSummary(result, includeObservability);
  await fs.writeFile(localAccessFile, contents, "utf8");
  return localAccessFile;
}

export function printServiceSummary(result, includeObservability = false) {
  const stackEnv = result.stackEnv ?? defaultStackEnv;
  console.log("");
  console.log("Local stack summary");
  console.log("===================");
  console.log(`Frontend:  http://localhost:${stackEnv.LOCAL_FRONTEND_PORT}`);
  console.log(`Backend:   http://localhost:${stackEnv.LOCAL_BACKEND_PORT}`);
  console.log(`Redis:     localhost:${stackEnv.LOCAL_REDIS_PORT}`);
  if (includeObservability) {
    console.log(`Prometheus: http://localhost:${stackEnv.LOCAL_PROMETHEUS_PORT}`);
    console.log(`Grafana:    http://localhost:${stackEnv.LOCAL_GRAFANA_PORT} (admin/admin)`);
    console.log(`Loki:       http://localhost:${stackEnv.LOCAL_LOKI_PORT}`);
    console.log(`Tempo:      http://localhost:${stackEnv.LOCAL_TEMPO_PORT}`);
    console.log(`Alloy:      http://localhost:${stackEnv.LOCAL_ALLOY_PORT}`);
    console.log(`OTLP HTTP:  http://localhost:${stackEnv.LOCAL_OTLP_HTTP_PORT}`);
  } else {
    console.log(`Prometheus: http://localhost:${stackEnv.LOCAL_PROMETHEUS_PORT} (run npm run up:obs)`);
    console.log(`Grafana:    http://localhost:${stackEnv.LOCAL_GRAFANA_PORT} (run npm run up:obs, admin/admin)`);
    console.log(`Loki:       http://localhost:${stackEnv.LOCAL_LOKI_PORT} (run npm run up:obs)`);
    console.log(`Tempo:      http://localhost:${stackEnv.LOCAL_TEMPO_PORT} (run npm run up:obs)`);
    console.log(`Alloy:      http://localhost:${stackEnv.LOCAL_ALLOY_PORT} (run npm run up:obs)`);
    console.log(`OTLP HTTP:  http://localhost:${stackEnv.LOCAL_OTLP_HTTP_PORT} (run npm run up:obs)`);
  }
  console.log("");
  console.log("External dependencies");
  console.log("=====================");
  console.log("- Hosted Supabase");
  console.log("- Hosted OpenAI");
  console.log("- Hosted Deepgram");
  console.log("- Hosted Notion OAuth");
  console.log("- Hosted Razorpay");
  console.log("");

  for (const service of result.services) {
    const icon = service.status === "ready" ? "OK" : "FAIL";
    console.log(`${icon} ${service.name}: ${service.detail}`);
  }

  if (result.warnings.length > 0) {
    console.log("");
    console.log("Warnings");
    console.log("========");
    for (const warning of result.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log("");
  console.log(`Local access file: ${relPath(localAccessFile)}`);
}
