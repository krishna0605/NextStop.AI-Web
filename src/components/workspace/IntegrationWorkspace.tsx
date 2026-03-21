"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { CalendarDays, ExternalLink, NotebookTabs, Settings2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase-browser";
import type { IntegrationRecord } from "@/lib/workspace";

function statusCopy(
  record: IntegrationRecord | null,
  providerConfigured: boolean,
  provider: "google" | "notion"
) {
  if (record?.status === "connected") {
    return {
      label: "Connected",
      description:
        provider === "google"
          ? record.selected_calendar_name || "Calendar routing is ready."
          : record.selected_destination_name || "Export destination is ready.",
    };
  }

  if (providerConfigured) {
    return {
      label: "Needs connection",
      description:
        provider === "google"
          ? "OAuth and calendar selection still need to be connected for this account."
          : "Notion OAuth and destination routing still need to be connected for this account.",
    };
  }

  return {
    label: "Connection flow not wired yet",
    description:
      provider === "google"
        ? "This workspace expects a Supabase Edge Function driven Google connection flow, but the function endpoint is not wired into the web app yet."
        : "This workspace expects a Supabase Edge Function driven Notion connection flow, but the function endpoint is not wired into the web app yet.",
  };
}

export function IntegrationWorkspace({
  provider,
  record,
  providerConfigured,
}: {
  provider: "google" | "notion";
  record: IntegrationRecord | null;
  providerConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = statusCopy(record, providerConfigured, provider);
  const isGoogle = provider === "google";
  const Icon = isGoogle ? CalendarDays : NotebookTabs;
  const supabase = createClient();
  const [busyAction, setBusyAction] = useState<"connect" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("connected")
      ? `${isGoogle ? "Google" : "Notion"} connected successfully.`
      : null
  );
  const isConnected = record?.status === "connected";
  const actionLabel = useMemo(() => {
    if (isConnected) {
      return `Reconnect ${isGoogle ? "Google" : "Notion"}`;
    }

    return `Connect ${isGoogle ? "Google" : "Notion"}`;
  }, [isConnected, isGoogle]);

  async function handleConnect() {
    setBusyAction("connect");
    setError(null);
    setNotice(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?intent=${encodeURIComponent(
        isGoogle ? "connect-google" : "connect-notion"
      )}&next=${encodeURIComponent(isGoogle ? "/dashboard/google" : "/dashboard/notion")}`;

      const oauthOptions = {
        redirectTo,
        scopes: isGoogle
          ? "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
          : undefined,
        queryParams: isGoogle
          ? {
              access_type: "offline",
              prompt: "consent",
              include_granted_scopes: "true",
            }
          : undefined,
      };

      const result = await supabase.auth.signInWithOAuth({
        provider,
        options: oauthOptions,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to start the connection flow."
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
        body: JSON.stringify({ provider }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to disconnect this integration.");
      }

      setNotice(`${isGoogle ? "Google" : "Notion"} has been disconnected.`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to disconnect this integration."
      );
    } finally {
      setBusyAction(null);
    }
  }

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
              <Icon className="mr-2 h-4 w-4" />
              {isGoogle ? "Google Workspace" : "Notion Workspace"}
            </div>
            <h1 className="text-3xl font-bold text-white">
              {isGoogle ? "Google Calendar and Meet" : "Notion export workspace"}
            </h1>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              {isGoogle
                ? "Create or open meetings from the web workspace, then route the session into capture and review."
                : "Keep summaries and findings export-ready without storing transcripts or raw media."}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            <p className="font-medium text-white">{copy.label}</p>
            <p className="mt-1 text-zinc-500">{copy.description}</p>
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
              <p className="mt-3 text-lg font-semibold text-white">{copy.label}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                {isGoogle ? "Selected calendar" : "Selected destination"}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {isGoogle
                  ? record?.selected_calendar_name || "Not selected"
                  : record?.selected_destination_name || "Not selected"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                {isGoogle ? "Connected account" : "Workspace"}
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {record?.external_account_email ||
                  record?.external_workspace_name ||
                  "Not connected"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Backend config</p>
              <p className="mt-3 text-lg font-semibold text-white">
                {providerConfigured ? "Edge-function ready" : "Needs function wiring"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">What this page owns</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {isGoogle ? "Meet creation workflow" : "Export destination workflow"}
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <Settings2 className="mt-0.5 h-5 w-5 text-[var(--brand-primary)]" />
                <div>
                  <p className="font-medium text-white">
                    {isGoogle ? "Calendar routing" : "Page-first or database-first routing"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    {isGoogle
                      ? "This page will eventually own calendar selection, scheduled Meet creation, and event-open actions."
                      : "This page will eventually own destination selection, sync retries, and export previews."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-[var(--brand-highlight)]" />
                <div>
                  <p className="font-medium text-white">Current implementation</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    The workspace foundation is wired. Real OAuth and provider-backed actions should
                    be delegated to your Supabase Edge Functions rather than local client secrets in
                    this Next.js app.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                radius="full"
                onPress={handleConnect}
                isLoading={busyAction === "connect"}
                className="brand-button-primary h-11 w-full font-semibold"
              >
                {busyAction === "connect" ? "Starting..." : actionLabel}
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
              <Link href={isGoogle ? "#workspace-capture-island" : "/dashboard/library"}>
                <Button radius="full" className="brand-button-secondary h-11 w-full font-semibold">
                  {isGoogle ? "Open capture controls" : "Open findings library"}
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
