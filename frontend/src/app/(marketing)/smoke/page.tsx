import { Suspense } from "react";

import { notFound } from "next/navigation";

import { GoogleWorkspace } from "@/components/workspace/GoogleWorkspace";
import { MeetingReview } from "@/components/workspace/MeetingReview";
import { NotionWorkspace } from "@/components/workspace/NotionWorkspace";
import {
  WorkspaceCaptureProvider,
  WorkspaceCaptureSidebarPanel,
} from "@/components/workspace/WorkspaceCaptureIsland";
import { WorkspaceLibrary } from "@/components/workspace/WorkspaceLibrary";
import {
  smokeAiStatusReady,
  smokeMeetingArtifacts,
  smokeGoogleReconnectRecord,
  smokeMeetingExports,
  smokeNotionNeedsDestinationRecord,
  smokeReadyFindings,
  smokeReadyMeeting,
  smokeTranscriptDisabled,
  smokeWorkspaceOverview,
} from "@/test-support/workspace-fixtures";

export const dynamic = "force-dynamic";

export default function SmokePage() {
  if (process.env.ENABLE_SMOKE_ROUTES !== "true" && process.env.NODE_ENV !== "test") {
    notFound();
  }

  return (
    <WorkspaceCaptureProvider>
      <div className="space-y-8 px-6 py-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Smoke Harness</p>
          <h1 className="text-4xl font-bold text-white">Workspace smoke states</h1>
          <p className="max-w-3xl text-sm leading-7 text-zinc-400">
            This page exists only for CI and validation. It renders deterministic workspace states so
            browser smoke tests can verify the product shell without real provider credentials.
          </p>
        </header>

        <section aria-label="Google reconnect state">
          <Suspense fallback={<div className="text-sm text-zinc-500">Loading Google smoke state...</div>}>
            <GoogleWorkspace record={smokeGoogleReconnectRecord} />
          </Suspense>
        </section>

        <section aria-label="Notion destination state">
          <Suspense fallback={<div className="text-sm text-zinc-500">Loading Notion smoke state...</div>}>
            <NotionWorkspace
              record={smokeNotionNeedsDestinationRecord}
              providerConfigured
            />
          </Suspense>
        </section>

        <section aria-label="Library state">
          <WorkspaceLibrary overview={smokeWorkspaceOverview} />
        </section>

        <section aria-label="Review state">
          <MeetingReview
            meeting={smokeReadyMeeting}
            findings={smokeReadyFindings}
            artifacts={smokeMeetingArtifacts}
            aiStatus={smokeAiStatusReady}
            exports={smokeMeetingExports}
            notion={smokeNotionNeedsDestinationRecord}
            transcriptAvailability={smokeTranscriptDisabled}
            providerStatus={smokeWorkspaceOverview.providerStatus}
          />
        </section>

        <WorkspaceCaptureSidebarPanel className="max-w-xs" />
      </div>
    </WorkspaceCaptureProvider>
  );
}
