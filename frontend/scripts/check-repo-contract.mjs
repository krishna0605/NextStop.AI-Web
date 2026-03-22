import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const requiredFiles = [
  ".env.example",
  "docs/production-runbook.md",
  "docs/production-readiness-report.md",
];

const forbiddenTrackedPatterns = [
  /^\.env(?!\.example$).+/,
  /^.*\.log$/i,
  /^dev-check\.log$/i,
  /^webpack-dev\.log$/i,
  /^generate_history\.js$/i,
  /^git_commit_history\.md$/i,
];

async function ensureRequiredFilesExist() {
  const missing = [];

  for (const file of requiredFiles) {
    try {
      await access(file, constants.F_OK);
    } catch {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required repo contract files: ${missing.join(", ")}`);
  }
}

async function ensureNoForbiddenTrackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files"], { encoding: "utf8" });
  const trackedFiles = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const forbidden = trackedFiles.filter((file) =>
    forbiddenTrackedPatterns.some((pattern) => pattern.test(file))
  );

  if (forbidden.length > 0) {
    throw new Error(`Forbidden tracked artifacts detected: ${forbidden.join(", ")}`);
  }
}

async function main() {
  await ensureRequiredFilesExist();
  await ensureNoForbiddenTrackedFiles();
  console.log("Repository contract checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
