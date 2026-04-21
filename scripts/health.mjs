import {
  printServiceSummary,
  runHealthChecks,
  writeLocalAccessSummary,
} from "./local-stack-lib.mjs";

const args = new Set(process.argv.slice(2));
const includeObservability = args.has("--observability");
const wait = args.has("--wait");
const timeoutFlag = [...args].find((arg) => arg.startsWith("--timeout="));
const timeoutMs = timeoutFlag ? Number(timeoutFlag.split("=")[1]) : 90_000;

const result = await runHealthChecks({
  includeObservability,
  wait,
  timeoutMs,
});

await writeLocalAccessSummary(result, includeObservability);
printServiceSummary(result, includeObservability);

if (!result.ok) {
  console.error("");
  console.error("Local stack health check failed:");
  for (const failure of result.failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("");
console.log("Local stack is healthy.");
