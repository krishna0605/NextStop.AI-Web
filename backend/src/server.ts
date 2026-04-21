import Fastify from "fastify";

import {
  captureException,
  getMetricsContentType,
  getMetricsPayload,
  getObservabilityStatus,
  initObservability,
  recordHttpRequest,
  syncRuntimeGaugeSnapshot,
} from "./observability.js";
import { getAiQueue, removeQueuedAiJob } from "./queue.js";
import {
  buildEntitlements,
  createAdminClient,
  getDisplayName,
  requireUserFromAuthHeader,
  resolveBillingSnapshot,
} from "./supabase.js";
import {
  loadCleanupStatus,
  loadHostedVerificationStatus,
  loadLaunchCertificationStatus,
  loadSecurityStatus,
  recordHostedVerification,
  recordLaunchCertification,
} from "./runtime-status.js";
import { getWorkerState } from "./worker-state.js";

initObservability("nextstop-ai-core-api");

type TranscriptionJobPayload = {
  jobId: string;
  meetingId: string;
  userId: string;
};

type RegenerationJobPayload = TranscriptionJobPayload & {
  artifactType: string;
};

const app = Fastify({ logger: true });
const queue = getAiQueue();

app.addHook("onRequest", async (request) => {
  (request as typeof request & { startedAt?: number }).startedAt = Date.now();
});

app.addHook("onResponse", async (request, reply) => {
  const startedAt = (request as typeof request & { startedAt?: number }).startedAt ?? Date.now();
  recordHttpRequest({
    method: request.method,
    route: request.routeOptions.url || request.url,
    statusCode: reply.statusCode,
    durationMs: Date.now() - startedAt,
  });
});

app.addHook("onError", async (request, _reply, error) => {
  captureException(error, {
    service: "nextstop-ai-core-api",
    route: request.routeOptions.url || request.url,
  });
});

async function countTableRows(
  table: string,
  filters: Array<{ column: string; value: string }> = []
) {
  const admin = createAdminClient();
  let query = admin.from(table).select("*", { count: "exact", head: true });

  for (const filter of filters) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function loadMeetingStatusCounts() {
  const statuses = [
    "finalizing_upload",
    "queued",
    "transcribing",
    "transcript_ready",
    "analyzing",
    "ready",
    "canceled",
    "failed",
  ] as const;

  const counts = await Promise.all(
    statuses.map(async (status) => [
      status,
      await countTableRows("web_meetings", [{ column: "status", value: status }]),
    ] as const)
  );

  return Object.fromEntries(counts);
}

app.get("/health", async () => {
  const [worker, cleanup, security, hostedVerification, launchCertification] = await Promise.all([
    getWorkerState(),
    loadCleanupStatus(),
    loadSecurityStatus(),
    loadHostedVerificationStatus(),
    loadLaunchCertificationStatus(),
  ]);
  return {
    ok: true,
    service: "nextstop-ai-core",
    queue: "nextstop-ai-jobs",
    directExecution: worker.directExecution,
    workerReady: worker.workerReady,
    workerVersion: worker.workerVersion,
    degradedReason: worker.degradedReason,
    workerStale: worker.stale,
    lastWorkerHeartbeatAt: worker.lastHeartbeatAt,
    lastJobName: worker.lastProcessedJobName,
    lastAiJobId: worker.lastProcessedJobId,
    cleanup,
    security,
    hostedVerification,
    launchCertification,
    observability: getObservabilityStatus("nextstop-ai-core-api"),
    aiPipelineMode: process.env.AI_PIPELINE_MODE ?? "railway_remote",
    deepgramConfigured: Boolean(process.env.DEEPGRAM_API_KEY),
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
  };
});

app.get("/metrics", async (_request, reply) => {
  const [
    worker,
    cleanup,
    security,
    hostedVerification,
    launchCertification,
    queueCounts,
    meetingCountByStatus,
    cancelRequestedJobs,
  ] = await Promise.all([
    getWorkerState(),
    loadCleanupStatus(),
    loadSecurityStatus(),
    loadHostedVerificationStatus(),
    loadLaunchCertificationStatus(),
    queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
    loadMeetingStatusCounts(),
    countTableRows("ai_jobs", [{ column: "status", value: "cancel_requested" }]),
  ]);
  const heartbeatAgeSeconds =
    worker.lastHeartbeatAt && !Number.isNaN(new Date(worker.lastHeartbeatAt).getTime())
      ? Math.max(0, Math.round((Date.now() - new Date(worker.lastHeartbeatAt).getTime()) / 1000))
      : -1;

  syncRuntimeGaugeSnapshot({
    workerReady: worker.workerReady,
    workerStale: worker.stale,
    directExecution: worker.directExecution,
    heartbeatAgeSeconds,
    cleanupDeletedAudioAssets: cleanup.deletedAudioAssetCount,
    cleanupDeletedTranscriptAssets: cleanup.deletedTranscriptAssetCount,
    cleanupPendingExpiredAssets: cleanup.pendingExpiredAssetCount,
    cleanupFailures: cleanup.lastCleanupError ? 1 : 0,
    securityRateLimitDeniedCount: security.rateLimitDeniedCount,
    securityTranscriptGrantedCount: security.transcriptDownloadGrantedCount,
    securityTranscriptBlockedCount: security.transcriptDownloadBlockedCount,
    securityExportRequestedCount: security.exportRequestedCount,
    hostedVerificationPassed: hostedVerification.lastHostedVerificationStatus === "pass",
    launchCertified: launchCertification.lastLaunchCertificationStatus === "certified",
    queueDepthByState: {
      waiting: queueCounts.waiting ?? 0,
      active: queueCounts.active ?? 0,
      completed: queueCounts.completed ?? 0,
      failed: queueCounts.failed ?? 0,
      delayed: queueCounts.delayed ?? 0,
      paused: queueCounts.paused ?? 0,
    },
    meetingCountByStatus,
    cancelRequestedJobs,
  });

  reply.header("content-type", getMetricsContentType());
  return getMetricsPayload();
});

function requireSecret(authHeader?: string) {
  const expected = process.env.AI_CORE_SHARED_SECRET;
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!expected || token !== expected) {
    throw new Error("Unauthorized");
  }
}

function assertTranscriptionPayload(body: unknown): TranscriptionJobPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid transcription payload.");
  }

  const payload = body as Partial<TranscriptionJobPayload>;

  if (!payload.jobId || !payload.meetingId || !payload.userId) {
    throw new Error("jobId, meetingId, and userId are required.");
  }

  return {
    jobId: payload.jobId,
    meetingId: payload.meetingId,
    userId: payload.userId,
  };
}

function assertRegenerationPayload(body: unknown): RegenerationJobPayload {
  const payload = body as Partial<RegenerationJobPayload>;
  const base = assertTranscriptionPayload(body);

  if (!payload.artifactType) {
    throw new Error("artifactType is required.");
  }

  return {
    ...base,
    artifactType: payload.artifactType,
  };
}

function assertHostedVerificationBody(body: unknown) {
  const payload = asObject(body);

  if (!payload) {
    throw new Error("Invalid hosted verification payload.");
  }

  const status = asString(payload.status);
  const allowedStatuses = new Set(["unknown", "pass", "fail", "blocked", "partial"]);

  if (!status || !allowedStatuses.has(status)) {
    throw new Error("status must be one of unknown, pass, fail, blocked, or partial.");
  }

  const rawScenarios = asObject(payload.scenarios) ?? {};
  const scenarios = Object.fromEntries(
    Object.entries(rawScenarios).map(([name, value]) => {
      const scenario = asObject(value) ?? {};
      const scenarioStatus = asString(scenario.status) ?? "unknown";

      if (!allowedStatuses.has(scenarioStatus)) {
        throw new Error(`Scenario ${name} has an invalid status.`);
      }

      return [
        name,
        {
          status: scenarioStatus as "unknown" | "pass" | "fail" | "blocked" | "partial",
          detail: asString(scenario.detail),
          checkedAt: asIsoString(scenario.checkedAt),
        },
      ];
    })
  );

  return {
    status: status as "unknown" | "pass" | "fail" | "blocked" | "partial",
    scenario: asString(payload.scenario),
    failureReason: asString(payload.failureReason),
    source: asString(payload.source),
    lastHostedVerificationAt: asIsoString(payload.lastHostedVerificationAt),
    scenarios,
  };
}

function assertLaunchCertificationBody(body: unknown) {
  const payload = asObject(body);

  if (!payload) {
    throw new Error("Invalid launch certification payload.");
  }

  const status = asString(payload.status);
  const allowedStatuses = new Set(["pending", "certified", "blocked"]);

  if (!status || !allowedStatuses.has(status)) {
    throw new Error("status must be one of pending, certified, or blocked.");
  }

  const readinessLaunchDecision = asString(payload.readinessLaunchDecision);

  if (
    readinessLaunchDecision &&
    !new Set(["ready", "degraded", "blocked"]).has(readinessLaunchDecision)
  ) {
    throw new Error("readinessLaunchDecision must be ready, degraded, or blocked.");
  }

  return {
    status: status as "pending" | "certified" | "blocked",
    certifiedBy: asString(payload.certifiedBy),
    certificationNotes: asString(payload.certificationNotes),
    validationGreen: payload.validationGreen === true,
    hostedVerificationPassed: payload.hostedVerificationPassed === true,
    operationalProofComplete: payload.operationalProofComplete === true,
    readinessLaunchDecision: (readinessLaunchDecision ??
      null) as "ready" | "degraded" | "blocked" | null,
    lastLaunchCertificationAt: asIsoString(payload.lastLaunchCertificationAt),
  };
}

async function enqueueJob(
  jobName: "transcribe" | "analyze" | "regenerate",
  payload: TranscriptionJobPayload | RegenerationJobPayload
) {
  await queue.add(jobName, payload, {
    jobId: payload.jobId,
    removeOnComplete: false,
    removeOnFail: false,
  });
}

function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message === "Unauthorized";
}

function asObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asRecordArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(asObject).filter((item): item is Record<string, unknown> => Boolean(item));
}

function asIsoString(value: unknown) {
  const parsed = asString(value);
  if (!parsed) {
    return null;
  }

  const time = Date.parse(parsed);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function asJsonRecord(value: unknown) {
  return asObject(value) ?? {};
}

function assertDesktopDeviceBody(body: unknown) {
  const payload = asObject(body);

  if (!payload) {
    throw new Error("Invalid request body.");
  }

  const deviceId = asString(payload.deviceId);
  const platform = asString(payload.platform);

  if (!deviceId || !platform) {
    throw new Error("deviceId and platform are required.");
  }

  return {
    deviceId,
    platform,
    appVersion: asString(payload.appVersion),
    metadata: asJsonRecord(payload.metadata),
  };
}

function assertDesktopMeetingBody(body: unknown) {
  const payload = asObject(body);

  if (!payload) {
    throw new Error("Invalid request body.");
  }

  const title = asString(payload.title);
  const sourceType = asString(payload.sourceType);

  if (!title || !sourceType) {
    throw new Error("title and sourceType are required.");
  }

  return {
    localMeetingId: asString(payload.localMeetingId),
    title,
    sourceType,
    status: asString(payload.status) ?? "draft",
    tags: asStringArray(payload.tags),
    startedAt: asIsoString(payload.startedAt),
    endedAt: asIsoString(payload.endedAt),
    originDeviceId: asString(payload.originDeviceId),
    transcriptStorage: asString(payload.transcriptStorage) ?? "none",
    sessionMetadata: asJsonRecord(payload.sessionMetadata),
  };
}

function assertDesktopMeetingPatch(body: unknown) {
  const payload = asObject(body);

  if (!payload) {
    throw new Error("Invalid request body.");
  }

  return {
    title: asString(payload.title),
    status: asString(payload.status),
    tags: Array.isArray(payload.tags) ? asStringArray(payload.tags) : undefined,
    startedAt: "startedAt" in payload ? asIsoString(payload.startedAt) : undefined,
    endedAt: "endedAt" in payload ? asIsoString(payload.endedAt) : undefined,
    sessionMetadata:
      "sessionMetadata" in payload ? asJsonRecord(payload.sessionMetadata) : undefined,
  };
}

function assertDesktopOutputsBody(body: unknown) {
  const payload = asObject(body);

  if (!payload) {
    throw new Error("Invalid request body.");
  }

  const findings = asObject(payload.findings);

  if (!findings) {
    throw new Error("findings payload is required.");
  }

  return {
    localMeetingId: asString(payload.localMeetingId),
    status: asString(payload.status) ?? "ready",
    startedAt: asIsoString(payload.startedAt),
    endedAt: asIsoString(payload.endedAt),
    transcriptStorage: asString(payload.transcriptStorage) ?? "local_only",
    findings: {
      summaryShort: asString(findings.summaryShort),
      summaryFull: asString(findings.summaryFull),
      executiveBullets: asStringArray(findings.executiveBullets),
      decisions: asStringArray(findings.decisions),
      actionItems: asStringArray(findings.actionItems),
      risks: asStringArray(findings.risks),
      followUps: asStringArray(findings.followUps),
      emailDraft: asString(findings.emailDraft),
      sourceModel: asString(findings.sourceModel),
      generatedAt: asIsoString(findings.generatedAt) ?? new Date().toISOString(),
      outputVersion:
        typeof findings.outputVersion === "number" && Number.isFinite(findings.outputVersion)
          ? Math.max(1, Math.floor(findings.outputVersion))
          : 1,
    },
    artifacts: {
      canonicalJson: asObject(asObject(payload.artifacts)?.canonicalJson),
      canonicalMarkdown: asString(asObject(payload.artifacts)?.canonicalMarkdown),
    },
    exportEvents: asRecordArray(payload.exportEvents).map((item) => ({
      exportType: asString(item.exportType) ?? "notion",
      status: asString(item.status) ?? "success",
      destination: asString(item.destination),
      externalId: asString(item.externalId),
      createdAt: asIsoString(item.createdAt) ?? new Date().toISOString(),
      metadata: asJsonRecord(item.metadata),
    })),
    metadata: asJsonRecord(payload.metadata),
  };
}

async function buildBootstrapPayload(userId: string, email: string | null | undefined) {
  const admin = createAdminClient();
  const billing = await resolveBillingSnapshot(userId);
  const entitlements = buildEntitlements(billing.planCode, billing.accessState);
  const [{ data: recentMeetings }, { data: devices }] = await Promise.all([
    admin
      .from("web_meetings")
      .select(
        "id,title,source_type,status,tags,started_at,ended_at,origin_platform,origin_device_id,external_local_id,transcript_storage,updated_at"
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(12),
    admin
      .from("desktop_devices")
      .select("device_id, platform, app_version, last_seen_at, last_entitlement_refresh_at")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(5),
  ]);

  return {
    user: {
      id: userId,
      email,
      display_name: getDisplayName(
        {
          email,
          user_metadata: {},
        },
        billing.profile
      ),
    },
    profile: {
      ...(billing.profile ?? {}),
      plan_code: billing.planCode,
      access_state: billing.accessState,
      current_period_end: billing.currentPeriodEnd,
    },
    subscription: billing.subscription,
    entitlements,
    devices: devices ?? [],
    recent_meetings: recentMeetings ?? [],
    schema_version: "desktop-shared-workspace-v1",
    synced_at: new Date().toISOString(),
  };
}

app.post("/jobs/transcribe", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertTranscriptionPayload(request.body);
    await enqueueJob("transcribe", payload);
    return { ok: true, enqueued: "transcribe", jobId: payload.jobId };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to enqueue transcription." };
  }
});

app.post("/jobs/analyze", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertTranscriptionPayload(request.body);
    await enqueueJob("analyze", payload);
    return { ok: true, enqueued: "analyze", jobId: payload.jobId };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to enqueue analysis." };
  }
});

app.post("/jobs/cancel", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const body = asObject(request.body);
    const jobId = asString(body?.jobId);

    if (!jobId) {
      reply.status(400);
      return { error: "jobId is required." };
    }

    const result = await removeQueuedAiJob(jobId);
    return {
      ok: true,
      jobId,
      removed: result.removed,
      missing: result.missing,
    };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to cancel queued job." };
  }
});

app.post("/runtime/hosted-verification", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertHostedVerificationBody(request.body);
    recordHostedVerification(payload);
    return { ok: true, hostedVerification: payload };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return {
      error:
        error instanceof Error ? error.message : "Unable to record hosted verification status.",
    };
  }
});

app.post("/runtime/launch-certification", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertLaunchCertificationBody(request.body);
    recordLaunchCertification(payload);
    return { ok: true, launchCertification: payload };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return {
      error:
        error instanceof Error ? error.message : "Unable to record launch certification status.",
    };
  }
});

app.get("/v1/desktop/bootstrap", async (request, reply) => {
  try {
    const { user } = await requireUserFromAuthHeader(request.headers.authorization);
    return await buildBootstrapPayload(user.id, user.email);
  } catch (error) {
    reply.status(isUnauthorized(error) ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to load desktop bootstrap." };
  }
});

app.post("/v1/desktop/devices/register", async (request, reply) => {
  try {
    const { user } = await requireUserFromAuthHeader(request.headers.authorization);
    const device = assertDesktopDeviceBody(request.body);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("desktop_devices")
      .upsert(
        {
          user_id: user.id,
          device_id: device.deviceId,
          platform: device.platform,
          app_version: device.appVersion,
          metadata: device.metadata,
          last_seen_at: new Date().toISOString(),
          last_entitlement_refresh_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,device_id",
        }
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return { ok: true, device: data };
  } catch (error) {
    reply.status(isUnauthorized(error) ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to register device." };
  }
});

app.post("/v1/desktop/meetings", async (request, reply) => {
  try {
    const { user } = await requireUserFromAuthHeader(request.headers.authorization);
    const meeting = assertDesktopMeetingBody(request.body);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("web_meetings")
      .upsert(
        {
          user_id: user.id,
          title: meeting.title,
          source_type: meeting.sourceType,
          status: meeting.status,
          tags: meeting.tags,
          started_at: meeting.startedAt,
          ended_at: meeting.endedAt,
          origin_platform: "desktop",
          origin_device_id: meeting.originDeviceId,
          external_local_id: meeting.localMeetingId,
          transcript_storage: meeting.transcriptStorage,
          session_metadata: {
            ...meeting.sessionMetadata,
            sync_origin: "desktop",
          },
        },
        {
          onConflict: "user_id,origin_platform,external_local_id",
        }
      )
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return {
      ok: true,
      meeting: data,
      remoteMeetingId: (data as { id: string }).id,
    };
  } catch (error) {
    reply.status(isUnauthorized(error) ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to sync meeting shell." };
  }
});

app.patch("/v1/desktop/meetings/:meetingId", async (request, reply) => {
  try {
    const { user } = await requireUserFromAuthHeader(request.headers.authorization);
    const { meetingId } = request.params as { meetingId: string };
    const updates = assertDesktopMeetingPatch(request.body);
    const admin = createAdminClient();
    const payload: Record<string, unknown> = {};

    if (updates.title) payload.title = updates.title;
    if (updates.status) payload.status = updates.status;
    if (updates.tags) payload.tags = updates.tags;
    if (updates.startedAt !== undefined) payload.started_at = updates.startedAt;
    if (updates.endedAt !== undefined) payload.ended_at = updates.endedAt;
    if (updates.sessionMetadata !== undefined) payload.session_metadata = updates.sessionMetadata;

    const { data, error } = await admin
      .from("web_meetings")
      .update(payload)
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return { ok: true, meeting: data };
  } catch (error) {
    reply.status(isUnauthorized(error) ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to update meeting." };
  }
});

app.post("/v1/desktop/meetings/:meetingId/outputs", async (request, reply) => {
  try {
    const { user } = await requireUserFromAuthHeader(request.headers.authorization);
    const { meetingId } = request.params as { meetingId: string };
    const payload = assertDesktopOutputsBody(request.body);
    const admin = createAdminClient();

    const { data: meeting, error: meetingError } = await admin
      .from("web_meetings")
      .select("id, title, source_type")
      .eq("id", meetingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (meetingError) {
      throw meetingError;
    }

    if (!meeting) {
      reply.status(404);
      return { error: "Meeting not found." };
    }

    await admin
      .from("web_meetings")
      .update({
        status: payload.status,
        started_at: payload.startedAt,
        ended_at: payload.endedAt,
        transcript_storage: payload.transcriptStorage,
      })
      .eq("id", meetingId)
      .eq("user_id", user.id);

    const sourceModel = payload.findings.sourceModel ?? "desktop-local-analysis";
    const canonicalJson = payload.artifacts.canonicalJson ?? {
      version: payload.findings.outputVersion,
      meetingId,
      title: (meeting as { title: string }).title,
      sourceType: (meeting as { source_type: string }).source_type,
      generatedAt: payload.findings.generatedAt,
      sourceModel,
      summaryShort:
        payload.findings.summaryShort ?? "Meeting findings are available for review.",
      summaryFull:
        payload.findings.summaryFull ??
        payload.findings.summaryShort ??
        "Meeting findings are available for review.",
      executiveBullets: payload.findings.executiveBullets,
      decisions: payload.findings.decisions,
      actionItems: payload.findings.actionItems,
      risks: payload.findings.risks,
      followUps: payload.findings.followUps,
      emailDraft:
        payload.findings.emailDraft ??
        `Subject: ${(meeting as { title: string }).title} recap\n\n${
          payload.findings.summaryShort ?? "Sharing the meeting findings."
        }`,
      transcriptStorage: payload.transcriptStorage,
    };
    const canonicalMarkdown =
      payload.artifacts.canonicalMarkdown ??
      [
        `# ${(meeting as { title: string }).title}`,
        "",
        "## Summary",
        payload.findings.summaryFull ??
          payload.findings.summaryShort ??
          "Meeting findings are available for review.",
      ].join("\n");

    const { error: findingsError } = await admin.from("meeting_findings").upsert(
      {
        meeting_id: meetingId,
        user_id: user.id,
        status: "ready",
        summary_short: payload.findings.summaryShort,
        summary_full: payload.findings.summaryFull,
        executive_bullets_json: payload.findings.executiveBullets,
        decisions_json: payload.findings.decisions,
        action_items_json: payload.findings.actionItems,
        risks_json: payload.findings.risks,
        follow_ups_json: payload.findings.followUps,
        email_draft: payload.findings.emailDraft,
        source_model: sourceModel,
      },
      { onConflict: "meeting_id" }
    );

    if (findingsError) {
      throw findingsError;
    }

    const artifactRows = [
      {
        meeting_id: meetingId,
        user_id: user.id,
        artifact_type: "canonical_json",
        status: "ready",
        payload_json: canonicalJson,
        source_model: sourceModel,
        version: payload.findings.outputVersion,
        metadata: {
          transcript_storage: payload.transcriptStorage,
          sync_origin: "desktop",
          ...payload.metadata,
        },
      },
      {
        meeting_id: meetingId,
        user_id: user.id,
        artifact_type: "canonical_markdown",
        status: "ready",
        payload_text: canonicalMarkdown,
        source_model: sourceModel,
        version: payload.findings.outputVersion,
        metadata: {
          transcript_storage: payload.transcriptStorage,
          sync_origin: "desktop",
        },
      },
      {
        meeting_id: meetingId,
        user_id: user.id,
        artifact_type: "summary",
        status: "ready",
        payload_json: {
          summaryShort: payload.findings.summaryShort,
          summaryFull: payload.findings.summaryFull,
          executiveBullets: payload.findings.executiveBullets,
        },
        payload_text:
          payload.findings.summaryFull ?? payload.findings.summaryShort ?? "",
        source_model: sourceModel,
        version: payload.findings.outputVersion,
        metadata: {
          transcript_storage: payload.transcriptStorage,
          sync_origin: "desktop",
        },
      },
      {
        meeting_id: meetingId,
        user_id: user.id,
        artifact_type: "action_items",
        status: "ready",
        payload_json: {
          actionItems: payload.findings.actionItems,
          decisions: payload.findings.decisions,
          risks: payload.findings.risks,
          followUps: payload.findings.followUps,
        },
        payload_text: payload.findings.actionItems.join("\n"),
        source_model: sourceModel,
        version: payload.findings.outputVersion,
        metadata: {
          transcript_storage: payload.transcriptStorage,
          sync_origin: "desktop",
        },
      },
      {
        meeting_id: meetingId,
        user_id: user.id,
        artifact_type: "email_draft",
        status: "ready",
        payload_text: payload.findings.emailDraft ?? "",
        source_model: sourceModel,
        version: payload.findings.outputVersion,
        metadata: {
          transcript_storage: payload.transcriptStorage,
          sync_origin: "desktop",
        },
      },
    ];

    const { error: artifactError } = await admin.from("meeting_artifacts").upsert(artifactRows, {
      onConflict: "meeting_id,artifact_type",
    });

    if (artifactError) {
      throw artifactError;
    }

    if (payload.exportEvents.length > 0) {
      const { error: exportError } = await admin.from("meeting_exports").insert(
        payload.exportEvents.map((item) => ({
          meeting_id: meetingId,
          user_id: user.id,
          export_type: item.exportType,
          status: item.status,
          destination: item.destination,
          metadata: {
            external_id: item.externalId,
            sync_origin: "desktop",
            ...item.metadata,
          },
          created_at: item.createdAt,
        }))
      );

      if (exportError) {
        throw exportError;
      }
    }

    return {
      ok: true,
      meetingId,
      findingsSynced: true,
      artifactsSynced: artifactRows.length,
      exportEventsSynced: payload.exportEvents.length,
    };
  } catch (error) {
    reply.status(isUnauthorized(error) ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to sync meeting outputs." };
  }
});

app.get("/v1/workspace/overview", async (request, reply) => {
  try {
    const { user } = await requireUserFromAuthHeader(request.headers.authorization);
    const admin = createAdminClient();
    const { data: meetings, error } = await admin
      .from("web_meetings")
      .select(
        "id,title,source_type,status,tags,started_at,ended_at,origin_platform,origin_device_id,external_local_id,transcript_storage,updated_at"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return {
      ok: true,
      meetings: meetings ?? [],
      synced_at: new Date().toISOString(),
    };
  } catch (error) {
    reply.status(isUnauthorized(error) ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to load workspace overview." };
  }
});

app.post("/jobs/finalize", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertTranscriptionPayload(request.body);
    await enqueueJob("transcribe", payload);
    return { ok: true, enqueued: "transcribe", compatibility: "finalize_alias", jobId: payload.jobId };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to enqueue transcription." };
  }
});

app.post("/jobs/regenerate", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const payload = assertRegenerationPayload(request.body);
    await enqueueJob("regenerate", payload);
    return { ok: true, enqueued: "regenerate", jobId: payload.jobId };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to enqueue regeneration." };
  }
});

app.post("/jobs/:jobId/retry", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const jobId = (request.params as { jobId: string }).jobId;
    const job = await queue.getJob(jobId);

    if (!job) {
      reply.status(404);
      return { error: "Job not found." };
    }

    const state = await job.getState();

    if (state === "failed") {
      await job.retry();
      return { ok: true, retried: true, jobId };
    }

    return { ok: true, retried: false, jobId, state };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to retry the job." };
  }
});

app.get("/jobs/:jobId", async (request, reply) => {
  try {
    requireSecret(request.headers.authorization);
    const jobId = (request.params as { jobId: string }).jobId;
    const job = await queue.getJob(jobId);

    return {
      id: job?.id ?? jobId,
      name: job?.name ?? null,
      state: job ? await job.getState() : "missing",
      attemptsMade: job?.attemptsMade ?? 0,
    };
  } catch (error) {
    reply.status(error instanceof Error && error.message === "Unauthorized" ? 401 : 400);
    return { error: error instanceof Error ? error.message : "Unable to inspect the job." };
  }
});

app.listen({
  host: "0.0.0.0",
  port: Number(process.env.PORT ?? 8080),
});
