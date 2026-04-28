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
const sharedEnv = { ...process.env, ...stackEnv };

function getComposeCommandArgs() {
  const composeCommandArgs = [
    "compose",
    ...composeArgs(includeObservability),
  ];

  if (includeObservability) {
    composeCommandArgs.push("--profile", "observability");
  }

  return composeCommandArgs;
}

function getUpArgs() {
  const upArgs = [...getComposeCommandArgs(), "up", "-d", "--remove-orphans"];

  if (build) {
    upArgs.push("--build");
  }

  return upArgs;
}

function isMissingComposeNetworkError(error) {
  return (
    error instanceof Error &&
    /failed to set up container networking: network .* not found/i.test(
      error.message
    )
  );
}

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

console.log("Starting NextStop local stack...");
try {
  await runCommand("docker", getUpArgs(), { env: sharedEnv });
} catch (error) {
  if (!isMissingComposeNetworkError(error)) {
    throw error;
  }

  console.warn(
    "Docker reported a missing compose network. Cleaning stale containers and retrying once..."
  );

  await runCommand(
    "docker",
    [...getComposeCommandArgs(), "down", "--remove-orphans"],
    { env: sharedEnv, allowFailure: true }
  );

  await runCommand("docker", getUpArgs(), { env: sharedEnv });
}

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
