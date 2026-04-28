import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const riskAcceptancePath = path.join(
  repoRoot,
  "docs",
  "dependency-risk-acceptance-2026-04-28.md"
);

const requiredFields = [
  /Advisory:\s*`?GHSA-qx2v-qp2m-jg93`?/i,
  /Package:\s*`?postcss`?/i,
  /Severity:\s*Moderate/i,
  /Accepted until:\s*`?(\d{4}-\d{2}-\d{2})`?/i,
  /Owner:\s*\S.+/i,
  /## Removal Condition/i,
  /## Guardrail/i,
];

function extractExpiry(markdown) {
  const match = markdown.match(/Accepted until:\s*`?(\d{4}-\d{2}-\d{2})`?/i);
  return match?.[1] ?? null;
}

function isExpired(acceptedUntil) {
  const expiry = new Date(`${acceptedUntil}T23:59:59.999Z`);
  return Number.isNaN(expiry.getTime()) || Date.now() > expiry.getTime();
}

async function main() {
  const markdown = await readFile(riskAcceptancePath, "utf8");
  const missingFields = requiredFields.filter((field) => !field.test(markdown));
  const expiry = extractExpiry(markdown);

  if (missingFields.length > 0) {
    throw new Error(
      `Dependency risk acceptance is missing required metadata fields (${missingFields.length}).`
    );
  }

  if (!expiry || isExpired(expiry)) {
    throw new Error(`Dependency risk acceptance expired or invalid: ${expiry ?? "missing"}.`);
  }

  console.log(`Dependency risk acceptance is documented and unexpired through ${expiry}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
