import "server-only";

import { Redis } from "ioredis";

export type SecurityPolicyName =
  | "transcript_download"
  | "pdf_export"
  | "notion_export"
  | "meeting_process"
  | "meeting_finalize"
  | "artifact_regenerate";

export type SecurityAuditEvent =
  | {
      type: "rate_limit_denied";
      policyName: SecurityPolicyName;
    }
  | {
      type: "transcript_download_granted";
    }
  | {
      type: "transcript_download_blocked";
      reason: string;
    }
  | {
      type: "export_requested";
      policyName: Extract<SecurityPolicyName, "pdf_export" | "notion_export">;
    };

export type SecurityStatusSnapshot = {
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

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number | null;
  policyName: SecurityPolicyName;
};

type PolicyConfig = {
  limit: number;
  windowSeconds: number;
  scope: "user" | "meeting";
};

const SECURITY_STATUS_KEY = "nextstop:runtime:security";
const SECURITY_STATUS_TTL_SECONDS = Number(process.env.SECURITY_STATUS_TTL_SECONDS ?? 86400);

const defaultSecurityStatus: SecurityStatusSnapshot = {
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

const policies: Record<SecurityPolicyName, PolicyConfig> = {
  transcript_download: {
    limit: 6,
    windowSeconds: 300,
    scope: "meeting",
  },
  pdf_export: {
    limit: 8,
    windowSeconds: 600,
    scope: "meeting",
  },
  notion_export: {
    limit: 8,
    windowSeconds: 600,
    scope: "meeting",
  },
  meeting_process: {
    limit: 10,
    windowSeconds: 600,
    scope: "meeting",
  },
  meeting_finalize: {
    limit: 6,
    windowSeconds: 600,
    scope: "meeting",
  },
  artifact_regenerate: {
    limit: 12,
    windowSeconds: 600,
    scope: "meeting",
  },
};

let redisClient: Redis | null = null;

function getRedisClient() {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  return redisClient;
}

async function getConnectedRedis() {
  const client = getRedisClient();

  if (!client) {
    return null;
  }

  if (client.status === "wait") {
    await client.connect();
  }

  return client;
}

async function readSecurityStatus() {
  try {
    const redis = await getConnectedRedis();

    if (!redis) {
      return { ...defaultSecurityStatus };
    }

    const payload = await redis.get(SECURITY_STATUS_KEY);

    if (!payload) {
      return { ...defaultSecurityStatus };
    }

    return {
      ...defaultSecurityStatus,
      ...(JSON.parse(payload) as Partial<SecurityStatusSnapshot>),
    };
  } catch (error) {
    console.warn("[security-controls] Unable to read security status", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return { ...defaultSecurityStatus };
  }
}

async function writeSecurityStatus(snapshot: SecurityStatusSnapshot) {
  try {
    const redis = await getConnectedRedis();

    if (!redis) {
      return;
    }

    await redis.set(
      SECURITY_STATUS_KEY,
      JSON.stringify(snapshot),
      "EX",
      SECURITY_STATUS_TTL_SECONDS
    );
  } catch (error) {
    console.warn("[security-controls] Unable to write security status", {
      message: error instanceof Error ? error.message : "unknown error",
    });
  }
}

function incrementBucket(bucket: Record<string, number>, key: string) {
  return {
    ...bucket,
    [key]: (bucket[key] ?? 0) + 1,
  };
}

export async function recordSecurityAudit(event: SecurityAuditEvent) {
  const current = await readSecurityStatus();
  const now = new Date().toISOString();
  const next: SecurityStatusSnapshot = {
    ...current,
    lastEventAt: now,
  };

  switch (event.type) {
    case "rate_limit_denied":
      next.rateLimitDeniedCount += 1;
      next.lastRateLimitDeniedAt = now;
      next.denialByPolicy = incrementBucket(next.denialByPolicy, event.policyName);
      break;
    case "transcript_download_granted":
      next.transcriptDownloadGrantedCount += 1;
      next.lastTranscriptDownloadGrantedAt = now;
      break;
    case "transcript_download_blocked":
      next.transcriptDownloadBlockedCount += 1;
      next.lastTranscriptDownloadBlockedAt = now;
      next.transcriptBlocksByReason = incrementBucket(
        next.transcriptBlocksByReason,
        event.reason
      );
      break;
    case "export_requested":
      next.exportRequestedCount += 1;
      next.lastExportRequestedAt = now;
      next.exportRequestsByPolicy = incrementBucket(
        next.exportRequestsByPolicy,
        event.policyName
      );
      break;
  }

  await writeSecurityStatus(next);
}

function buildRateLimitKey(args: {
  policyName: SecurityPolicyName;
  userId: string;
  meetingId?: string;
}) {
  const policy = policies[args.policyName];
  const windowBucket = Math.floor(Date.now() / (policy.windowSeconds * 1000));
  const scopePart =
    policy.scope === "meeting" && args.meetingId ? `meeting:${args.meetingId}` : "scope:user";

  return `nextstop:rate-limit:${args.policyName}:user:${args.userId}:${scopePart}:window:${windowBucket}`;
}

export async function enforceRateLimit(args: {
  policyName: SecurityPolicyName;
  userId: string;
  meetingId?: string;
}) {
  const policy = policies[args.policyName];

  try {
    const redis = await getConnectedRedis();

    if (!redis) {
      return {
        allowed: true,
        retryAfterSeconds: null,
        policyName: args.policyName,
      } satisfies RateLimitResult;
    }

    const key = buildRateLimitKey(args);
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, policy.windowSeconds);
    }

    if (count > policy.limit) {
      const ttlSeconds = await redis.ttl(key);
      await recordSecurityAudit({
        type: "rate_limit_denied",
        policyName: args.policyName,
      });

      return {
        allowed: false,
        retryAfterSeconds: ttlSeconds > 0 ? ttlSeconds : policy.windowSeconds,
        policyName: args.policyName,
      } satisfies RateLimitResult;
    }

    return {
      allowed: true,
      retryAfterSeconds: null,
      policyName: args.policyName,
    } satisfies RateLimitResult;
  } catch (error) {
    console.warn("[security-controls] Rate limiting degraded open", {
      policyName: args.policyName,
      message: error instanceof Error ? error.message : "unknown error",
    });

    return {
      allowed: true,
      retryAfterSeconds: null,
      policyName: args.policyName,
    } satisfies RateLimitResult;
  }
}
