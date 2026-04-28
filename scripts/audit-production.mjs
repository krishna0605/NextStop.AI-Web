import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const acceptedAdvisories = new Map([
  [
    "https://github.com/advisories/GHSA-qx2v-qp2m-jg93",
    {
      id: "GHSA-qx2v-qp2m-jg93",
      packageName: "postcss",
      acceptedUntil: "2026-05-28",
      reason:
        "Next 16.2.4 hard-pins postcss 8.4.31 internally; npm suggests a breaking downgrade instead of a safe patch.",
    },
  ],
]);

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function runAudit() {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npm audit --omit=dev --json"]
      : ["audit", "--omit=dev", "--json"];
  const result = spawnSync(command, args, {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.stdout?.trim()) {
    throw new Error(result.stderr?.trim() || "npm audit did not return JSON output.");
  }

  return JSON.parse(result.stdout);
}

function acceptanceExpired(acceptedUntil) {
  const expiry = new Date(`${acceptedUntil}T23:59:59.999Z`);
  return Number.isNaN(expiry.getTime()) || Date.now() > expiry.getTime();
}

function collectAdvisoryUrls(vulnerabilities, name, seen = new Set()) {
  if (seen.has(name)) {
    return [];
  }

  seen.add(name);
  const vulnerability = vulnerabilities[name];
  if (!vulnerability) {
    return [];
  }

  return vulnerability.via.flatMap((entry) => {
    if (typeof entry === "string") {
      return collectAdvisoryUrls(vulnerabilities, entry, seen);
    }

    return typeof entry?.url === "string" ? [entry.url] : [];
  });
}

function evaluateVulnerability(vulnerabilities, name) {
  const vulnerability = vulnerabilities[name];
  const advisoryUrls = [...new Set(collectAdvisoryUrls(vulnerabilities, name))];
  const unacceptedUrls = advisoryUrls.filter((url) => !acceptedAdvisories.has(url));
  const expiredUrls = advisoryUrls.filter((url) => {
    const accepted = acceptedAdvisories.get(url);
    return accepted ? acceptanceExpired(accepted.acceptedUntil) : false;
  });

  if (severityRank[vulnerability.severity] >= severityRank.high) {
    return {
      accepted: false,
      detail: `${name} is ${vulnerability.severity}; high and critical production advisories cannot be accepted by this gate.`,
    };
  }

  if (advisoryUrls.length === 0) {
    return {
      accepted: false,
      detail: `${name} has no advisory URL to match against the accepted-risk list.`,
    };
  }

  if (unacceptedUrls.length > 0) {
    return {
      accepted: false,
      detail: `${name} includes unaccepted advisory URL(s): ${unacceptedUrls.join(", ")}`,
    };
  }

  if (expiredUrls.length > 0) {
    return {
      accepted: false,
      detail: `${name} accepted advisory expired: ${expiredUrls.join(", ")}`,
    };
  }

  return {
    accepted: true,
    detail: `${name} is covered by accepted advisory ${advisoryUrls.join(", ")}`,
  };
}

function main() {
  const audit = runAudit();
  const vulnerabilities = audit.vulnerabilities ?? {};
  const names = Object.keys(vulnerabilities);
  const failures = [];
  const accepted = [];

  for (const name of names) {
    const result = evaluateVulnerability(vulnerabilities, name);
    if (result.accepted) {
      accepted.push(result.detail);
    } else {
      failures.push(result.detail);
    }
  }

  if (failures.length > 0) {
    console.error("Production dependency audit failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  if (accepted.length > 0) {
    console.warn("Production dependency audit passed with accepted time-boxed risk:");
    for (const acceptance of accepted) {
      console.warn(`- ${acceptance}`);
    }
    return;
  }

  console.log("Production dependency audit passed with no vulnerabilities.");
}

main();
