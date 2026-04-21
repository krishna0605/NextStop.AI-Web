import { createAdminClient } from "./supabase.js";
import { captureException, initObservability, logEvent } from "./observability.js";
import {
  recordCleanupFailure,
  recordCleanupRun,
  recordCleanupSuccess,
} from "./runtime-status.js";

type ExpiredMeetingAsset = {
  id: string;
  meeting_id: string;
  user_id: string;
  asset_kind: "audio_raw" | "transcript_text";
  bucket: string;
  path: string;
  status: string;
  expires_at: string | null;
  deleted_at?: string | null;
  deletion_status?: string | null;
};

const cleanupIntervalMs = Number(process.env.CLEANUP_INTERVAL_MS ?? 300_000);
const cleanupBatchSize = Number(process.env.CLEANUP_BATCH_SIZE ?? 100);

if (!Number.isFinite(cleanupIntervalMs) || cleanupIntervalMs <= 0) {
  throw new Error("CLEANUP_INTERVAL_MS must be a positive integer.");
}

if (!Number.isFinite(cleanupBatchSize) || cleanupBatchSize <= 0) {
  throw new Error("CLEANUP_BATCH_SIZE must be a positive integer.");
}

initObservability("nextstop-ai-cleanup");

async function queryExpiredAssets() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("meeting_assets")
    .select("id,meeting_id,user_id,asset_kind,bucket,path,status,expires_at,deleted_at,deletion_status")
    .in("asset_kind", ["audio_raw", "transcript_text"])
    .lt("expires_at", now)
    .is("deleted_at", null)
    .not("status", "eq", "deleted")
    .order("expires_at", { ascending: true })
    .limit(cleanupBatchSize);

  if (error) {
    throw error;
  }

  return (data as ExpiredMeetingAsset[] | null) ?? [];
}

async function updateAssetDeletionState(args: {
  assetIds: string[];
  status: "deleted" | "delete_failed";
  deletionError?: string | null;
}) {
  if (args.assetIds.length === 0) {
    return;
  }

  const admin = createAdminClient();
  const updates =
    args.status === "deleted"
      ? {
          status: "deleted",
          deleted_at: new Date().toISOString(),
          deletion_status: "deleted",
          deletion_error: null,
        }
      : {
          deletion_status: "delete_failed",
          deletion_error: args.deletionError ?? "Cleanup delete failed.",
        };

  const { error } = await admin.from("meeting_assets").update(updates).in("id", args.assetIds);

  if (error) {
    throw error;
  }
}

async function deleteExpiredAssets(expiredAssets: ExpiredMeetingAsset[]) {
  const admin = createAdminClient();
  const assetsByBucket = expiredAssets.reduce<Record<string, ExpiredMeetingAsset[]>>((acc, asset) => {
    acc[asset.bucket] = acc[asset.bucket] ?? [];
    acc[asset.bucket].push(asset);
    return acc;
  }, {});

  let deletedAudioAssetCount = 0;
  let deletedTranscriptAssetCount = 0;

  for (const [bucket, assets] of Object.entries(assetsByBucket)) {
    const paths = assets.map((asset) => asset.path);
    const { error } = await admin.storage.from(bucket).remove(paths);

    if (error) {
      await updateAssetDeletionState({
        assetIds: assets.map((asset) => asset.id),
        status: "delete_failed",
        deletionError: error.message,
      });
      throw error;
    }

    await updateAssetDeletionState({
      assetIds: assets.map((asset) => asset.id),
      status: "deleted",
    });

    for (const asset of assets) {
      if (asset.asset_kind === "audio_raw") {
        deletedAudioAssetCount += 1;
      } else {
        deletedTranscriptAssetCount += 1;
      }
    }
  }

  return {
    deletedAudioAssetCount,
    deletedTranscriptAssetCount,
  };
}

async function runCleanupTick() {
  let pendingExpiredAssetCount = 0;

  try {
    const expiredAssets = await queryExpiredAssets();
    pendingExpiredAssetCount = expiredAssets.length;
    recordCleanupRun(expiredAssets.length);

    if (expiredAssets.length === 0) {
      recordCleanupSuccess({
        pendingExpiredAssetCount: 0,
        deletedAudioAssetCount: 0,
        deletedTranscriptAssetCount: 0,
      });
      logEvent("info", "cleanup_tick_completed", {
        service: "nextstop-ai-cleanup",
        expiredAssetCount: 0,
        deletedAudioAssetCount: 0,
        deletedTranscriptAssetCount: 0,
      });
      return;
    }

    const deleted = await deleteExpiredAssets(expiredAssets);
    recordCleanupSuccess({
      pendingExpiredAssetCount: Math.max(
        0,
        expiredAssets.length -
          deleted.deletedAudioAssetCount -
          deleted.deletedTranscriptAssetCount
      ),
      deletedAudioAssetCount: deleted.deletedAudioAssetCount,
      deletedTranscriptAssetCount: deleted.deletedTranscriptAssetCount,
    });
    logEvent("info", "cleanup_tick_completed", {
      service: "nextstop-ai-cleanup",
      expiredAssetCount: expiredAssets.length,
      deletedAudioAssetCount: deleted.deletedAudioAssetCount,
      deletedTranscriptAssetCount: deleted.deletedTranscriptAssetCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup tick failed.";
    recordCleanupFailure(message, pendingExpiredAssetCount);
    captureException(error, {
      service: "nextstop-ai-cleanup",
      stage: "cleanup",
    });
    logEvent("error", "cleanup_tick_failed", {
      service: "nextstop-ai-cleanup",
      expiredAssetCount: pendingExpiredAssetCount,
      message,
    });
  }
}

logEvent("info", "cleanup_worker_started", {
  service: "nextstop-ai-cleanup",
  cleanupIntervalMs,
  cleanupBatchSize,
});

void runCleanupTick();

const timer = setInterval(() => {
  void runCleanupTick();
}, cleanupIntervalMs);

function shutdown(signal: string) {
  clearInterval(timer);
  logEvent("info", "cleanup_worker_shutdown", {
    service: "nextstop-ai-cleanup",
    signal,
  });
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
