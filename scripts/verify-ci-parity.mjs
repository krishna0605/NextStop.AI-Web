import { spawnSync } from "node:child_process";

const commands = [
  ["npm", ["ci", "--workspaces=false"], "frontend"],
  ["npm", ["ci", "--workspaces=false"], "backend"],
  ["npm", ["run", "test:repo-contract"], "frontend"],
  ["npm", ["run", "typecheck"], "frontend"],
  ["npm", ["run", "typecheck"], "backend"],
  ["npm", ["run", "lint"], "frontend"],
  ["npm", ["run", "build"], "frontend"],
  ["npm", ["run", "test", "--", "--coverage"], "frontend"],
  ["npm", ["run", "test"], "backend"],
  ["npm", ["run", "test:e2e", "--", "tests/e2e/smoke.spec.ts", "tests/e2e/marketing-pricing.spec.ts"], "frontend"],
];

for (const [command, args, cwd] of commands) {
  console.log(`\n[${cwd}] ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, cwd });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
