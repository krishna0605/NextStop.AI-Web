import {
  composeArgs,
  ensureDockerAvailable,
  loadStackEnv,
  printServiceSummary,
  runCommand,
  runHealthChecks,
  validateLocalEnv,
  writeLocalAccessSummary,
} from "./local-stack-lib.mjs";

const args = new Set(process.argv.slice(2));
const build = args.has("--build");
const includeObservability = args.has("--observability");
const stackEnv = await loadStackEnv();

const envCheck = await validateLocalEnv();
if (!envCheck.ok) {
  console.error("Local stack configuration is incomplete:");
  for (const failure of envCheck.failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (envCheck.warnings.length > 0) {
  console.warn("Local stack configuration warnings:");
  for (const warning of envCheck.warnings) {
    console.warn(`- ${warning}`);
  }
}

const dockerCheck = await ensureDockerAvailable();
if (!dockerCheck.ok) {
  console.error("Docker is unavailable.");
  console.error(dockerCheck.error);
  process.exit(1);
}

const upArgs = [
  "compose",
  ...composeArgs(includeObservability),
];

if (includeObservability) {
  upArgs.push("--profile", "observability");
}

upArgs.push("up", "-d", "--remove-orphans");

if (build) {
  upArgs.push("--build");
}

console.log("Starting NextStop local stack...");
await runCommand("docker", upArgs, { env: { ...process.env, ...stackEnv } });

console.log("Waiting for local stack readiness...");
const result = await runHealthChecks({
  includeObservability,
  wait: true,
  timeoutMs: includeObservability ? 120_000 : 90_000,
});

await writeLocalAccessSummary(result, includeObservability);
printServiceSummary(result, includeObservability);

if (!result.ok) {
  console.error("");
  console.error("Startup completed, but the local stack is not fully ready:");
  for (const failure of result.failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("");
console.log("NextStop local stack is ready.");
