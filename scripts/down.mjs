import { composeArgs, loadStackEnv, runCommand } from "./local-stack-lib.mjs";

const stackEnv = await loadStackEnv();

const args = [
  "compose",
  ...composeArgs(true),
  "down",
  "--remove-orphans",
];

await runCommand("docker", args, { env: { ...process.env, ...stackEnv } });
