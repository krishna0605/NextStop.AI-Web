import { Redis } from "ioredis";

type WorkerRuntimeStatus = {
  workerReady: boolean;
  lastHeartbeatAt: string | null;
  lastProcessedJobId: string | null;
  lastProcessedJobName: string | null;
  executionMode: "railway_worker_direct";
  workerVersion: string;
  degradedReason: string | null;
  directExecution: boolean;
};

type CleanupRuntimeStatus = {
  lastCleanupRunAt: string | null;
  lastCleanupSuccessAt: string | null;
  lastCleanupError: string | null;
  deletedAudioAssetCount: number;
  deletedTranscriptAssetCount: number;
  pendingExpiredAssetCount: number;
};

type SecurityRuntimeStatus = {
  lastEventAt: string | null;
  lastRateLimitDeniedAt: string | null;
  lastTranscriptDownloadGrantedAt: string | null;
  lastTranscriptDownloadBlockedAt: string | null;
  lastExportRequestedAt: string | null;
  rateLimitDeniedCount: number;
  transcriptDownloadGrantedCount: number;
  transcriptDownloadBlockedCount: number;
  exportRequestedCount: number;
  denialByPolicy: Record<string, number>;
  transcriptBlocksByReason: Record<string, number>;
  exportRequestsByPolicy: Record<string, number>;
};

type HostedVerificationRuntimeStatus = {
  lastHostedVerificationAt: string | null;
  lastHostedVerificationStatus: "unknown" | "pass" | "fail" | "blocked" | "partial";
  lastHostedVerificationScenario: string | null;
  lastHostedVerificationFailureReason: string | null;
  source: string | null;
  scenarios: Record<
    string,
    {
      status: "unknown" | "pass" | "fail" | "blocked" | "partial";
      detail: string | null;
      checkedAt: string | null;
    }
  >;
};

type LaunchCertificationRuntimeStatus = {
  lastLaunchCertificationAt: string | null;
  lastLaunchCertificationStatus: "pending" | "certified" | "blocked";
  certifiedBy: string | null;
  certificationNotes: string | null;
  validationGreen: boolean;
  hostedVerificationPassed: boolean;
  operationalProofComplete: boolean;
  readinessLaunchDecision: "ready" | "degraded" | "blocked" | null;
};

const WORKER_STATUS_KEY = "nextstop:runtime:worker";
const CLEANUP_STATUS_KEY = "nextstop:runtime:cleanup";
const SECURITY_STATUS_KEY = "nextstop:runtime:security";
const HOSTED_VERIFICATION_STATUS_KEY = "nextstop:runtime:hosted-verification";
const LAUNCH_CERTIFICATION_STATUS_KEY = "nextstop:runtime:launch-certification";
const WORKER_STATUS_TTL_SECONDS = Number(process.env.WORKER_STATUS_TTL_SECONDS ?? 180);
const CLEANUP_STATUS_TTL_SECONDS = Number(process.env.CLEANUP_STATUS_TTL_SECONDS ?? 3600);
const CERTIFICATION_STATUS_TTL_SECONDS = Number(
  process.env.CERTIFICATION_STATUS_TTL_SECONDS ?? 60 * 60 * 24 * 30
);

const defaultWorkerStatus: WorkerRuntimeStatus = {
  workerReady: false,
  lastHeartbeatAt: null,
  lastProcessedJobId: null,
  lastProcessedJobName: null,
  executionMode: "railway_worker_direct",
  workerVersion: "dev",
  degradedReason: null,
  directExecution: true,
};

const defaultCleanupStatus: CleanupRuntimeStatus = {
  lastCleanupRunAt: null,
  lastCleanupSuccessAt: null,
  lastCleanupError: null,
  deletedAudioAssetCount: 0,
  deletedTranscriptAssetCount: 0,
  pendingExpiredAssetCount: 0,
};

const defaultSecurityStatus: SecurityRuntimeStatus = {
  lastEventAt: null,
  lastRateLimitDeniedAt: null,
  lastTranscriptDownloadGrantedAt: null,
  lastTranscriptDownloadBlockedAt: null,
  lastExportRequestedAt: null,
  rateLimitDeniedCount: 0,
  transcriptDownloadGrantedCount: 0,
  transcriptDownloadBlockedCount: 0,
  exportRequestedCount: 0,
  denialByPolicy: {},
  transcriptBlocksByReason: {},
  exportRequestsByPolicy: {},
};

const defaultHostedVerificationStatus: HostedVerificationRuntimeStatus = {
  lastHostedVerificationAt: null,
  lastHostedVerificationStatus: "unknown",
  lastHostedVerificationScenario: null,
  lastHostedVerificationFailureReason: null,
  source: null,
  scenarios: {},
};

const defaultLaunchCertificationStatus: LaunchCertificationRuntimeStatus = {
  lastLaunchCertificationAt: null,
  lastLaunchCertificationStatus: "pending",
  certifiedBy: null,
  certificationNotes: null,
  validationGreen: false,
  hostedVerificationPassed: false,
  operationalProofComplete: false,
  readinessLaunchDecision: null,
};

let redisClient: Redis | null = null;
let localWorkerStatus: WorkerRuntimeStatus = { ...defaultWorkerStatus };
let localCleanupStatus: CleanupRuntimeStatus = { ...defaultCleanupStatus };
let localHostedVerificationStatus: HostedVerificationRuntimeStatus = {
  ...defaultHostedVerificationStatus,
};
let localLaunchCertificationStatus: LaunchCertificationRuntimeStatus = {
  ...defaultLaunchCertificationStatus,
};

function getStatusRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  }

  return redisClient;
}

function getReleaseVersion() {
  return (
    process.env.RELEASE_VERSION?.trim() ||
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    "dev"
  );
}

async function writeJson(key: string, value: object, ttlSeconds: number) {
  try {
    await getStatusRedisClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.warn("[runtime-status] Unable to write runtime status", {
      key,
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}

async function readJson<T extends object>(key: string) {
  try {
    const payload = await getStatusRedisClient().get(key);

    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as T;
  } catch (error) {
    console.warn("[runtime-status] Unable to read runtime status", {
      key,
      message: error instanceof Error ? error.message : "unknown error",
    });
    return null;
  }
}

function mergeWorkerStatus(
  updates: Partial<WorkerRuntimeStatus>,
  heartbeat = false
): WorkerRuntimeStatus {
  localWorkerStatus = {
    ...localWorkerStatus,
    ...updates,
    workerVersion: updates.workerVersion ?? localWorkerStatus.workerVersion ?? getReleaseVersion(),
    directExecution: updates.directExecution ?? true,
  };

  if (heartbeat) {
    localWorkerStatus.lastHeartbeatAt = new Date().toISOString();
  }

  return { ...localWorkerStatus };
}

function mergeCleanupStatus(updates: Partial<CleanupRuntimeStatus>): CleanupRuntimeStatus {
  localCleanupStatus = {
    ...localCleanupStatus,
    ...updates,
  };

  return { ...localCleanupStatus };
}

export function markWorkerReady() {
  const snapshot = mergeWorkerStatus(
    {
      workerReady: true,
      degradedReason: null,
      executionMode: "railway_worker_direct",
      workerVersion: getReleaseVersion(),
      directExecution: true,
    },
    true
  );
  void writeJson(WORKER_STATUS_KEY, snapshot, WORKER_STATUS_TTL_SECONDS);
}

export function markWorkerActivity(jobName: string, aiJobId?: string | null) {
  const snapshot = mergeWorkerStatus(
    {
      workerReady: true,
      lastProcessedJobName: jobName,
      lastProcessedJobId: aiJobId ?? null,
      degradedReason: null,
      workerVersion: getReleaseVersion(),
      directExecution: true,
    },
    true
  );
  void writeJson(WORKER_STATUS_KEY, snapshot, WORKER_STATUS_TTL_SECONDS);
}

export function markWorkerDegraded(reason: string, jobName?: string | null, aiJobId?: string | null) {
  const snapshot = mergeWorkerStatus(
    {
      workerReady: true,
      lastProcessedJobName: jobName ?? localWorkerStatus.lastProcessedJobName,
      lastProcessedJobId: aiJobId ?? localWorkerStatus.lastProcessedJobId,
      degradedReason: reason,
      workerVersion: getReleaseVersion(),
      directExecution: true,
    },
    true
  );
  void writeJson(WORKER_STATUS_KEY, snapshot, WORKER_STATUS_TTL_SECONDS);
}

export function markWorkerHeartbeat() {
  const snapshot = mergeWorkerStatus(
    {
      workerReady: true,
      workerVersion: getReleaseVersion(),
      directExecution: true,
    },
    true
  );
  void writeJson(WORKER_STATUS_KEY, snapshot, WORKER_STATUS_TTL_SECONDS);
}

export async function loadWorkerStatus() {
  const status = await readJson<WorkerRuntimeStatus>(WORKER_STATUS_KEY);
  const snapshot = status ? { ...defaultWorkerStatus, ...status } : { ...localWorkerStatus };
  const lastHeartbeatAt = snapshot.lastHeartbeatAt ? new Date(snapshot.lastHeartbeatAt).getTime() : NaN;
  const stale =
    Number.isFinite(lastHeartbeatAt) &&
    Date.now() - lastHeartbeatAt > Math.max(WORKER_STATUS_TTL_SECONDS - 30, 30) * 1000;

  return {
    ...snapshot,
    stale,
  };
}

export function recordCleanupRun(pendingExpiredAssetCount: number) {
  const snapshot = mergeCleanupStatus({
    lastCleanupRunAt: new Date().toISOString(),
    pendingExpiredAssetCount,
  });
  void writeJson(CLEANUP_STATUS_KEY, snapshot, CLEANUP_STATUS_TTL_SECONDS);
}

export function recordCleanupSuccess(args: {
  pendingExpiredAssetCount: number;
  deletedAudioAssetCount: number;
  deletedTranscriptAssetCount: number;
}) {
  const now = new Date().toISOString();
  const snapshot = mergeCleanupStatus({
    lastCleanupRunAt: now,
    lastCleanupSuccessAt: now,
    lastCleanupError: null,
    pendingExpiredAssetCount: args.pendingExpiredAssetCount,
    deletedAudioAssetCount:
      localCleanupStatus.deletedAudioAssetCount + args.deletedAudioAssetCount,
    deletedTranscriptAssetCount:
      localCleanupStatus.deletedTranscriptAssetCount + args.deletedTranscriptAssetCount,
  });
  void writeJson(CLEANUP_STATUS_KEY, snapshot, CLEANUP_STATUS_TTL_SECONDS);
}

export function recordCleanupFailure(errorMessage: string, pendingExpiredAssetCount: number) {
  const snapshot = mergeCleanupStatus({
    lastCleanupRunAt: new Date().toISOString(),
    lastCleanupError: errorMessage,
    pendingExpiredAssetCount,
  });
  void writeJson(CLEANUP_STATUS_KEY, snapshot, CLEANUP_STATUS_TTL_SECONDS);
}

export async function loadCleanupStatus() {
  const status = await readJson<CleanupRuntimeStatus>(CLEANUP_STATUS_KEY);
  return status ? { ...defaultCleanupStatus, ...status } : { ...localCleanupStatus };
}

export async function loadSecurityStatus() {
  const status = await readJson<SecurityRuntimeStatus>(SECURITY_STATUS_KEY);
  return status ? { ...defaultSecurityStatus, ...status } : { ...defaultSecurityStatus };
}

function mergeHostedVerificationStatus(
  updates: Partial<HostedVerificationRuntimeStatus>
): HostedVerificationRuntimeStatus {
  localHostedVerificationStatus = {
    ...localHostedVerificationStatus,
    ...updates,
    scenarios: {
      ...localHostedVerificationStatus.scenarios,
      ...(updates.scenarios ?? {}),
    },
  };

  return {
    ...localHostedVerificationStatus,
    scenarios: { ...localHostedVerificationStatus.scenarios },
  };
}

function mergeLaunchCertificationStatus(
  updates: Partial<LaunchCertificationRuntimeStatus>
): LaunchCertificationRuntimeStatus {
  localLaunchCertificationStatus = {
    ...localLaunchCertificationStatus,
    ...updates,
  };

  return { ...localLaunchCertificationStatus };
}

export function recordHostedVerification(args: {
  status: HostedVerificationRuntimeStatus["lastHostedVerificationStatus"];
  scenario?: string | null;
  failureReason?: string | null;
  source?: string | null;
  scenarios?: HostedVerificationRuntimeStatus["scenarios"];
  lastHostedVerificationAt?: string | null;
}) {
  const snapshot = mergeHostedVerificationStatus({
    lastHostedVerificationAt: args.lastHostedVerificationAt ?? new Date().toISOString(),
    lastHostedVerificationStatus: args.status,
    lastHostedVerificationScenario: args.scenario ?? null,
    lastHostedVerificationFailureReason: args.failureReason ?? null,
    source: args.source ?? null,
    scenarios: args.scenarios ?? {},
  });
  void writeJson(
    HOSTED_VERIFICATION_STATUS_KEY,
    snapshot,
    CERTIFICATION_STATUS_TTL_SECONDS
  );
}

export async function loadHostedVerificationStatus() {
  const status = await readJson<HostedVerificationRuntimeStatus>(HOSTED_VERIFICATION_STATUS_KEY);
  return status
    ? {
        ...defaultHostedVerificationStatus,
        ...status,
        scenarios: { ...defaultHostedVerificationStatus.scenarios, ...status.scenarios },
      }
    : {
        ...localHostedVerificationStatus,
        scenarios: { ...localHostedVerificationStatus.scenarios },
      };
}

export function recordLaunchCertification(args: {
  status: LaunchCertificationRuntimeStatus["lastLaunchCertificationStatus"];
  certifiedBy?: string | null;
  certificationNotes?: string | null;
  validationGreen: boolean;
  hostedVerificationPassed: boolean;
  operationalProofComplete: boolean;
  readinessLaunchDecision?: LaunchCertificationRuntimeStatus["readinessLaunchDecision"];
  lastLaunchCertificationAt?: string | null;
}) {
  const snapshot = mergeLaunchCertificationStatus({
    lastLaunchCertificationAt: args.lastLaunchCertificationAt ?? new Date().toISOString(),
    lastLaunchCertificationStatus: args.status,
    certifiedBy: args.certifiedBy ?? null,
    certificationNotes: args.certificationNotes ?? null,
    validationGreen: args.validationGreen,
    hostedVerificationPassed: args.hostedVerificationPassed,
    operationalProofComplete: args.operationalProofComplete,
    readinessLaunchDecision: args.readinessLaunchDecision ?? null,
  });
  void writeJson(
    LAUNCH_CERTIFICATION_STATUS_KEY,
    snapshot,
    CERTIFICATION_STATUS_TTL_SECONDS
  );
}

export async function loadLaunchCertificationStatus() {
  const status = await readJson<LaunchCertificationRuntimeStatus>(
    LAUNCH_CERTIFICATION_STATUS_KEY
  );
  return status ? { ...defaultLaunchCertificationStatus, ...status } : { ...localLaunchCertificationStatus };
}
