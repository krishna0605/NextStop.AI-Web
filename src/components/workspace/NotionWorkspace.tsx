"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { ExternalLink, NotebookTabs, RefreshCw, Settings2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { IntegrationRecord, NotionDestination } from "@/lib/workspace";

function getStatusPresentation(record: IntegrationRecord | null, providerConfigured: boolean) {
  if (record?.status === "connected") {
    return {
      label: "Connected",
      description: record.selected_destination_name || "Destination configured and ready for export.",
    };
  }

  if (record?.status === "needs_destination") {
    return {
      label: "Destination needed",
      description: "The workspace is connected. Choose where exported findings should be written.",
    };
  }

  if (record?.status === "error" || record?.status === "reconnect_required") {
    return {
      label: "Reconnect required",
      description: "The last Notion connection failed or expired. Reconnect the workspace to continue.",
    };
  }

  if (providerConfigured) {
    return {
      label: "Needs connection",
      description: "Connect a Notion workspace, then choose a page or database destination.",
    };
  }

  return {
    label: "Needs configuration",
    description:
      "Add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET to the server environment, then connect a Notion workspace.",
  };
}

function getIntegrationError(params: ReturnType<typeof useSearchParams>) {
  return params.get("integration_error_description") || params.get("integration_error");
}

export function NotionWorkspace({
  record,
  providerConfigured,
}: {
  record: IntegrationRecord | null;
  providerConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = getStatusPresentation(record, providerConfigured);
  const [busyAction, setBusyAction] = useState<
    "connect" | "disconnect" | "refresh" | "save" | null
  >(null);
  const [destinations, setDestinations] = useState<NotionDestination[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState(
    record?.selected_destination_id ?? ""
  );
  const [error, setError] = useState<string | null>(getIntegrationError(searchParams));
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("connected")
      ? "Notion connected successfully. Choose where exported findings should land."
      : null
  );

  const selectedDestination = useMemo(
    () => destinations.find((item) => item.id === selectedDestinationId) ?? null,
    [destinations, selectedDestinationId]
  );

  const isConnected =
    record?.status === "connected" || record?.status === "needs_destination";

  const loadDestinations = useCallback(async () => {
    setBusyAction("refresh");
    setError(null);

    try {
      const response = await fetch("/api/workspace/notion/destinations", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        error?: string;
        destinations?: NotionDestination[];
      };

      if (!response.ok) {
        if (response.status === 409) {
          router.refresh();
        }
        throw new Error(payload.error ?? "Unable to load Notion destinations.");
      }

      setDestinations(payload.destinations ?? []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load Notion destinations."
      );
    } finally {
      setBusyAction(null);
    }
  }, [router]);

  useEffect(() => {
    setError(getIntegrationError(searchParams));
  }, [searchParams]);

  useEffect(() => {
    setSelectedDestinationId(record?.selected_destination_id ?? "");
  }, [record?.selected_destination_id]);

  useEffect(() => {
    if (!isConnected) {
      setDestinations([]);
      return;
    }

    void loadDestinations();
  }, [isConnected, loadDestinations]);

  async function handleConnect() {
    setBusyAction("connect");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/workspace/notion/connect", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        authorizeUrl?: string;
      };

      if (!response.ok || !payload.authorizeUrl) {
        throw new Error(payload.error ?? "Unable to start the Notion connection flow.");
      }

      window.location.href = payload.authorizeUrl;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start the Notion connection flow."
      );
      setBusyAction(null);
    }
  }

  async function handleDisconnect() {
    setBusyAction("disconnect");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/workspace/integrations/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: "notion" }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to disconnect Notion.");
      }

      setNotice("Notion has been disconnected.");
      setDestinations([]);
      setSelectedDestinationId("");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to disconnect Notion.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSaveDestination() {
    if (!selectedDestination) {
      setError("Choose a Notion page or database before saving.");
      return;
    }

    setBusyAction("save");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/workspace/notion/destinations/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinationId: selectedDestination.id,
          destinationName: selectedDestination.name,
          destinationType: selectedDestination.type,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save the Notion destination.");
      }

      setNotice(`Saved ${selectedDestination.name} as the Notion export destination.`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the Notion destination."
      );
    } finally {
      setBusyAction(null);
    }
  }

  const actionLabel =
    isConnected || record?.status === "reconnect_required" || record?.status === "error"
      ? "Reconnect Notion"
      : "Connect Notion";

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="brand-chip mb-4 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium">
              <NotebookTabs className="mr-2 h-4 w-4" />
              Notion Workspace
            </div>
            <h1 className="text-3xl font-bold text-white">Notion export workspace</h1>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              Connect Notion as a workspace integration, choose a page or database destination, and
              export findings without storing transcripts or raw media. Destination routing and
              reconnect handling are now owned directly by this workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            <p className="font-medium text-white">{status.label}</p>
            <p className="mt-1 text-zinc-400">{status.description}</p>
          </div>
        </div>
      </motion.section>

      {notice ? (
        <section className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          {notice}
        </section>
      ) : null}

      {error ? (
        <section className="rounded-[2rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Current connection</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Workspace state</h2>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Status</p>
              <p className="mt-3 text-lg font-semibold text-white">{status.label}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Selected destination</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {record?.selected_destination_name || "Not selected"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Workspace</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {record?.external_workspace_name || "Not connected"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Connection broker</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {providerConfigured ? "Next.js OAuth broker" : "Needs configuration"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Destination routing</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Choose where findings will land</h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <Settings2 className="mt-0.5 h-5 w-5 text-[var(--brand-primary)]" />
                <div>
                  <p className="font-medium text-white">Page-first or database-first routing</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Choose a page to create a child page beneath it, or choose a database to create
                    a new row-backed page using the database title property.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--brand-highlight)]" />
                <div>
                  <p className="font-medium text-white">Workspace-owned integration</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    This connection now uses a dedicated server-side Notion OAuth broker instead of
                    relying on the older identity-style provider flow.
                  </p>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Available destinations</span>
              <select
                value={selectedDestinationId}
                onChange={(event) => setSelectedDestinationId(event.target.value)}
                disabled={!isConnected}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)] disabled:opacity-60"
              >
                <option value="">Choose a page or database</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.name} ({destination.type})
                  </option>
                ))}
              </select>
              {isConnected && destinations.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">
                  No shared pages or databases were returned yet. Share a target with the Notion integration, then refresh destinations.
                </p>
              ) : null}
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                radius="full"
                onPress={handleConnect}
                isDisabled={!providerConfigured && !isConnected}
                isLoading={busyAction === "connect"}
                className="brand-button-primary h-11 w-full font-semibold"
              >
                {actionLabel}
              </Button>
              <Button
                radius="full"
                onPress={() => void loadDestinations()}
                isDisabled={!isConnected}
                isLoading={busyAction === "refresh"}
                className="brand-button-secondary h-11 w-full font-semibold"
                startContent={busyAction === "refresh" ? undefined : <RefreshCw className="h-4 w-4" />}
              >
                Refresh destinations
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                radius="full"
                onPress={handleSaveDestination}
                isDisabled={!selectedDestination || !isConnected}
                isLoading={busyAction === "save"}
                className="brand-button-secondary h-11 w-full font-semibold"
              >
                Save destination
              </Button>
              <Button
                radius="full"
                onPress={handleDisconnect}
                isDisabled={!isConnected}
                isLoading={busyAction === "disconnect"}
                className="brand-button-secondary h-11 w-full font-semibold"
              >
                Disconnect
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link href="/dashboard/library">
                <Button radius="full" className="brand-button-secondary h-11 w-full font-semibold">
                  Open findings library
                </Button>
              </Link>
              <Link href="/dashboard/settings">
                <Button
                  radius="full"
                  className="brand-button-secondary h-11 w-full font-semibold"
                  endContent={<ExternalLink className="h-4 w-4" />}
                >
                  Open settings
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
