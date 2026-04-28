import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");
const sourceRoot = path.join(frontendRoot, "src");

const sensitiveKeyFragments = ["token", "jwt", "secret", "refresh", "session", "auth"];

const approvedStorageKeys = new Map([
  [
    "nextstop-workspace-capture-session",
    "Non-sensitive browser capture recovery state. It stores meeting/capture references, not auth tokens or provider credentials.",
  ],
  [
    "nextstop-ai-review-mode",
    "Non-sensitive UI preference for simple versus advanced AI review display mode.",
  ],
]);

async function listSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if ([".next", "coverage", "node_modules"].includes(entry.name)) {
        continue;
      }

      files.push(...(await listSourceFiles(fullPath)));
      continue;
    }

    if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function collectStringConstants(source) {
  const constants = new Map();
  const constantPattern = /\bconst\s+([A-Z0-9_]+)\s*=\s*["'`]([^"'`]+)["'`]/g;

  for (const match of source.matchAll(constantPattern)) {
    constants.set(match[1], match[2]);
  }

  return constants;
}

function resolveStorageKey(rawArg, constants) {
  const trimmed = rawArg.trim();
  const literal = trimmed.match(/^["'`]([^"'`]+)["'`]$/);

  if (literal) {
    return literal[1];
  }

  return constants.get(trimmed) ?? null;
}

function hasSensitiveKeyFragment(key) {
  const normalized = key.toLowerCase();
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
}

function lineNumberForIndex(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function inspectStorageUsage(source, filePath) {
  const constants = collectStringConstants(source);
  const findings = [];
  const storageCallPattern =
    /\b(?:window\.)?(localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*([^,\n)]+)/g;

  for (const match of source.matchAll(storageCallPattern)) {
    const key = resolveStorageKey(match[2], constants);

    if (!key) {
      findings.push({
        filePath,
        line: lineNumberForIndex(source, match.index ?? 0),
        detail: "Browser storage key is dynamic or unresolved; use an approved constant key.",
      });
      continue;
    }

    if (hasSensitiveKeyFragment(key) && !approvedStorageKeys.has(key)) {
      findings.push({
        filePath,
        line: lineNumberForIndex(source, match.index ?? 0),
        detail: `Browser storage key "${key}" looks credential-like and is not approved.`,
      });
      continue;
    }

    if (approvedStorageKeys.has(key)) {
      continue;
    }
  }

  return findings;
}

async function main() {
  const files = await listSourceFiles(sourceRoot);
  const findings = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    findings.push(...inspectStorageUsage(source, file));
  }

  if (findings.length > 0) {
    console.error("Browser storage guardrail failed:");
    for (const finding of findings) {
      const relativePath = path.relative(frontendRoot, finding.filePath).replaceAll("\\", "/");
      console.error(`- ${relativePath}:${finding.line} ${finding.detail}`);
    }
    console.error("");
    console.error("Approved browser storage keys:");
    for (const [key, reason] of approvedStorageKeys) {
      console.error(`- ${key}: ${reason}`);
    }
    process.exit(1);
  }

  console.log("Browser storage guardrail passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
