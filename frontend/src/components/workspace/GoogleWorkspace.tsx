"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { CalendarDays, ExternalLink, PlayCircle, RefreshCw, Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useWorkspaceCaptureController } from "@/components/workspace/WorkspaceCaptureIsland";
import { resolvePublicApiUrl } from "@/lib/public-backend";
import { createClient } from "@/lib/supabase-browser";
import type { IntegrationRecord } from "@/lib/workspace";

type GoogleCalendarOption = {
  id: string;
  summary: string;
  primary: boolean;
};

type GoogleEventSummary = {
  id: string;
  summary: string;
  htmlLink: string | null;
  hangoutLink: string | null;
  start: string | null;
  end: string | null;
};

function toLocalInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatEventDate(dateString: string | null) {
  if (!dateString) {
    return "Time not set";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function GoogleWorkspace({ record }: { record: IntegrationRecord | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { openCaptureControls } = useWorkspaceCaptureController();

  const reconnectMessage =
    (record?.status === "error" || record?.status === "reconnect_required") &&
    record.metadata &&
    typeof record.metadata === "object" &&
    typeof record.metadata.last_error === "string"
      ? record.metadata.last_error
      : null;
  const [busyAction, setBusyAction] = useState<
    "connect" | "disconnect" | "instant" | "schedule" | "calendar" | null
  >(null);
  const [error, setError] = useState<string | null>(reconnectMessage);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("connected") ? "Google connected successfully." : null
  );
  const [calendars, setCalendars] = useState<GoogleCalendarOption[]>([]);
  const [events, setEvents] = useState<GoogleEventSummary[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(record?.selected_calendar_id ?? "");
  const [loadingOverview, setLoadingOverview] = useState(record?.status === "connected");

  const defaultStart = useMemo(() => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 15);
    start.setSeconds(0, 0);
    return toLocalInputValue(start);
  }, []);
  const defaultEnd = useMemo(() => {
    const end = new Date();
    end.setMinutes(end.getMinutes() + 45);
    end.setSeconds(0, 0);
    return toLocalInputValue(end);
  }, []);

  const [title, setTitle] = useState("NextStop meeting");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(defaultEnd);
  const [attendees, setAttendees] = useState("");

  const isConnected = record?.status === "connected";
  const needsReconnect =
    record?.status === "error" || record?.status === "reconnect_required";

  const loadOverview = useCallback(async () => {
    if (!isConnected) {
      setCalendars([]);
      setEvents([]);
      return;
    }

    setLoadingOverview(true);
    setError(null);

    try {
      const response = await fetch(resolvePublicApiUrl("/api/workspace/google/overview"));
      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 409) router.refresh();
        throw new Error(payload.error ?? "Unable to load Google workspace.");
      }

      setCalendars(payload.calendars ?? []);
      setEvents(payload.events ?? []);
      setSelectedCalendarId(payload.selectedCalendarId ?? "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to load Google workspace."
      );
    } finally {
      setLoadingOverview(false);
    }
  }, [isConnected, router]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleConnect() {
    setBusyAction("connect");
    setError(null);
    setNotice(null);

    const redirectTo = `${window.location.origin}/auth/callback?intent=${encodeURIComponent(
      "connect-google"
    )}&next=${encodeURIComponent("/dashboard/google")}`;

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes:
          "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setBusyAction(null);
    }
  }

  async function handleDisconnect() {
    setBusyAction("disconnect");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(resolvePublicApiUrl("/api/workspace/integrations/disconnect"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider: "google" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to disconnect Google.");
      }

      setNotice("Google has been disconnected.");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to disconnect Google.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCalendarSelect(calendarId: string) {
    setSelectedCalendarId(calendarId);
    setBusyAction("calendar");
    setError(null);

    try {
      const response = await fetch(resolvePublicApiUrl("/api/workspace/google/calendars/select"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ calendarId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save the selected calendar.");
      }

      await loadOverview();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the selected calendar."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleInstantMeet() {
    setBusyAction("instant");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(resolvePublicApiUrl("/api/workspace/google/instant-meet"), {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to start an instant Meet.");
      }

      if (payload.meetUrl) {
        window.open(payload.meetUrl, "_blank", "noopener,noreferrer");
      }

      setNotice("Instant Google Meet created.");
      await loadOverview();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to start an instant Meet."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleScheduleMeeting() {
    setBusyAction("schedule");
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(resolvePublicApiUrl("/api/workspace/google/events"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: title,
          description,
          startIso: new Date(startAt).toISOString(),
          endIso: new Date(endAt).toISOString(),
          attendees: attendees
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          calendarId: selectedCalendarId || undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to schedule the Google Meet.");
      }

      if (payload.meetUrl) {
        window.open(payload.meetUrl, "_blank", "noopener,noreferrer");
      } else if (payload.eventUrl) {
        window.open(payload.eventUrl, "_blank", "noopener,noreferrer");
      }

      setNotice("Scheduled Google Meet created.");
      await loadOverview();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to schedule the Google Meet."
      );
    } finally {
      setBusyAction(null);
    }
  }

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
        >
          <div className="brand-chip mb-4 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium">
            <CalendarDays className="mr-2 h-4 w-4" />
            Google Workspace
          </div>
          <h1 className="text-3xl font-bold text-white">Google Calendar and Meet</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            {needsReconnect
              ? "Your saved Google session has expired. Reconnect Google to restore calendar access and Meet creation."
              : "Connect Google first, then create instant Meet sessions, schedule meetings, and launch capture directly from the browser workspace."}
          </p>
        </motion.section>

        {error ? (
          <section className="rounded-[2rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-10 text-center">
          <h2 className="text-2xl font-semibold text-white">
            {needsReconnect ? "Google needs to be reconnected" : "Google is not connected yet"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
            {needsReconnect
              ? "The stored Google token is no longer valid. Reconnect the same Google account to restore calendar syncing."
              : "Use the same Supabase account to connect Google Calendar and unlock instant Meet launch plus scheduled meeting creation."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              radius="full"
              onPress={handleConnect}
              isLoading={busyAction === "connect"}
              className="brand-button-primary h-12 px-8 font-semibold"
            >
              {needsReconnect ? "Reconnect Google" : "Connect Google"}
            </Button>
            <Link href="/dashboard/settings">
              <Button radius="full" className="brand-button-secondary h-12 px-8 font-semibold">
                Open settings
              </Button>
            </Link>
          </div>
        </section>
      </div>
    );
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
              <CalendarDays className="mr-2 h-4 w-4" />
              Google Workspace
            </div>
            <h1 className="text-3xl font-bold text-white">Google Calendar and Meet</h1>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              Launch an instant Google Meet or schedule a meeting with title, description, attendees,
              and calendar routing from the browser workspace. If tokens expire, the app attempts
              a silent refresh before falling back to reconnect.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            <p className="font-medium text-white">Connected account</p>
            <p className="mt-1 text-zinc-400">{record.external_account_email || "Connected"}</p>
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
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Live actions</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Instant Google Meet</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-400">
            Create a Meet instantly and open it in a new tab without filling out a scheduling form.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              radius="full"
              onPress={handleInstantMeet}
              isLoading={busyAction === "instant"}
              className="brand-button-primary h-12 font-semibold"
              startContent={busyAction === "instant" ? undefined : <PlayCircle className="h-4 w-4" />}
            >
              Start instant Google Meet
            </Button>
            <Button
              radius="full"
              onPress={() => void loadOverview()}
              isLoading={loadingOverview}
              className="brand-button-secondary h-12 font-semibold"
              startContent={loadingOverview ? undefined : <RefreshCw className="h-4 w-4" />}
            >
              Refresh workspace
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Selected calendar</p>
              <select
                value={selectedCalendarId}
                onChange={(event) => void handleCalendarSelect(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
              >
                <option value="">Choose a calendar</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                    {calendar.primary ? " (Primary)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                radius="full"
                onPress={handleConnect}
                isLoading={busyAction === "connect"}
                className="brand-button-secondary h-11 font-semibold"
              >
                Reconnect Google
              </Button>
              <Button
                radius="full"
                onPress={handleDisconnect}
                isLoading={busyAction === "disconnect"}
                className="brand-button-secondary h-11 font-semibold"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Scheduling</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Create a scheduled Google Meet</h2>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Meeting title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
                placeholder="Agenda, notes, or context for the meeting..."
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">Start</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-zinc-300">End</span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">Attendees</span>
              <input
                value={attendees}
                onChange={(event) => setAttendees(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-[rgb(var(--brand-primary-rgb)/0.5)]"
                placeholder="person1@example.com, person2@example.com"
              />
            </label>

            <Button
              radius="full"
              onPress={handleScheduleMeeting}
              isLoading={busyAction === "schedule"}
              className="brand-button-primary h-12 w-full font-semibold"
              startContent={busyAction === "schedule" ? undefined : <Video className="h-4 w-4" />}
            >
              Schedule Google Meet
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Upcoming meetings</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Meetings in the selected calendar</h2>
          </div>
          <button
            type="button"
            onClick={openCaptureControls}
            className="brand-link text-sm text-zinc-400"
          >
            Open capture controls
          </button>
        </div>

        {loadingOverview ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center text-sm text-zinc-500">
            Loading Google Calendar...
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-5 py-8 text-center text-sm text-zinc-500">
            No upcoming meetings found for the selected calendar yet.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{event.summary}</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {formatEventDate(event.start)}
                      {event.end ? ` - ${formatEventDate(event.end)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {event.hangoutLink ? (
                      <a href={event.hangoutLink} target="_blank" rel="noreferrer">
                        <Button
                          radius="full"
                          className="brand-button-primary h-10 px-5 font-semibold"
                          startContent={<PlayCircle className="h-4 w-4" />}
                        >
                          Join Meet
                        </Button>
                      </a>
                    ) : null}
                    {event.htmlLink ? (
                      <a href={event.htmlLink} target="_blank" rel="noreferrer">
                        <Button
                          radius="full"
                          className="brand-button-secondary h-10 px-5 font-semibold"
                          startContent={<ExternalLink className="h-4 w-4" />}
                        >
                          Open event
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
