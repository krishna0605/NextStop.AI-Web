import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["run", "security:audit"]],
  ["npm", ["--prefix", "frontend", "run", "test:repo-contract"]],
  ["npm", ["--prefix", "frontend", "run", "typecheck"]],
  ["npm", ["--prefix", "frontend", "run", "lint"]],
  ["npm", ["--prefix", "frontend", "run", "test", "--", "--coverage"]],
  ["npm", ["--prefix", "frontend", "run", "build"]],
  ["npm", ["--prefix", "frontend", "run", "test:e2e", "--", "tests/e2e/smoke.spec.ts", "tests/e2e/marketing-pricing.spec.ts"]],
  ["npm", ["--prefix", "backend", "run", "typecheck"]],
  ["npm", ["--prefix", "backend", "run", "test"]],
];

for (const [command, args] of commands) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
