"use client";

import { Button } from "@heroui/react";
import { AlertCircle, CalendarPlus2, CirclePause, CirclePlay, CircleStop, LoaderCircle, Minimize2, NotebookTabs, Radio, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BrandLogoIcon } from "@/components/BrandLogoIcon";

const STORAGE_KEY = "nextstop-workspace-capture-session";

type WorkspaceIslandVisibility = "collapsed" | "expanded";
type WorkspaceCaptureState = "idle" | "granting" | "recording" | "paused" | "processing" | "failed";
type MeetingTargetRef = { meetingId: string; title: string; sourceType: "google_meet" | "browser_tab"; googleEventId?: string | null; meetUrl?: string | null };
type ActiveMeetingRef = { id: string; title: string };
type RetryableFinalizePayload = { meeting: ActiveMeetingRef; blob: Blob };
type PersistedCaptureSession = {
  version: 1;
  captureState: WorkspaceCaptureState;
  elapsedSeconds: number;
  tabShared: boolean;
  micLive: boolean;
  error: string | null;
  notice: string | null;
  activeMeeting: ActiveMeetingRef | null;
  pendingMeeting: MeetingTargetRef | null;
};
type IslandContext = {
  googleConnected: boolean;
  notionConnected: boolean;
  latestCompletedMeeting: { id: string; title: string } | null;
  latestScheduledGoogleMeeting: { id: string; title: string; googleEventId: string | null; meetUrl: string | null } | null;
  activeMeeting: { id: string; title: string; status: string } | null;
};

function formatElapsed(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function buildDefaultMeetingTitle() {
  return `Browser Meeting - ${new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date())}`;
}

function statusChip(active: boolean, activeLabel: string, inactiveLabel: string) {
  return {
    label: active ? activeLabel : inactiveLabel,
    className: active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/5 text-zinc-400",
  };
}

function readPersistedSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PersistedCaptureSession) : null;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedSession(payload: PersistedCaptureSession | null) {
  if (typeof window === "undefined") return;
  if (!payload || payload.captureState === "idle") {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function WorkspaceCaptureIsland() {
  const router = useRouter();
  const [visibility, setVisibility] = useState<WorkspaceIslandVisibility>("collapsed");
  const [showRecordingPill, setShowRecordingPill] = useState(false);
  const [captureState, setCaptureState] = useState<WorkspaceCaptureState>("idle");
  const [context, setContext] = useState<IslandContext>({ googleConnected: false, notionConnected: false, latestCompletedMeeting: null, latestScheduledGoogleMeeting: null, activeMeeting: null });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tabShared, setTabShared] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingRef | null>(null);
  const [pendingMeeting, setPendingMeeting] = useState<MeetingTargetRef | null>(null);
  const [busyAction, setBusyAction] = useState<"google" | "notion" | null>(null);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mergedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const retryableFinalizeRef = useRef<RetryableFinalizePayload | null>(null);
  const restoredSessionRef = useRef(false);

  useEffect(() => {
    const persisted = readPersistedSession();
    if (persisted) {
      setElapsedSeconds(persisted.elapsedSeconds);
      setTabShared(persisted.tabShared);
      setMicLive(persisted.micLive);
      setPendingMeeting(persisted.pendingMeeting);
      setActiveMeeting(persisted.activeMeeting);
      setError(persisted.error);
      setNotice(
        persisted.notice ||
          "The browser capture session was interrupted by a refresh or navigation. Check Library for completed findings, then retry or discard this local session."
      );
      if (persisted.captureState !== "idle") {
        setCaptureState("failed");
        setVisibility("expanded");
      }
    }
    restoredSessionRef.current = true;
    void refreshContext();
  }, []);

  useEffect(() => {
    if (!restoredSessionRef.current) return;
    writePersistedSession(
      captureState === "idle" && !activeMeeting && !pendingMeeting && !error && !notice
        ? null
        : { version: 1, captureState, elapsedSeconds, tabShared, micLive, error, notice, activeMeeting, pendingMeeting }
    );
  }, [activeMeeting, captureState, elapsedSeconds, error, micLive, notice, pendingMeeting, tabShared]);

  useEffect(() => {
    if (captureState !== "recording") return;
    const interval = window.setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [captureState]);

  useEffect(() => {
    if (captureState === "processing" || captureState === "failed") {
      setVisibility("expanded");
      setShowRecordingPill(false);
    } else if (captureState === "idle") {
      setShowRecordingPill(false);
    }
  }, [captureState]);

  useEffect(() => {
    function openIslandFromHash() {
      if (window.location.hash === "#workspace-capture-island") {
        setVisibility("expanded");
        setShowRecordingPill(false);
      }
    }
    function handleOpenIsland() {
      setVisibility("expanded");
      setShowRecordingPill(false);
    }
    function handleCaptureTarget(event: Event) {
      const detail = (event as CustomEvent<MeetingTargetRef>).detail;
      if (!detail?.meetingId) return;
      setPendingMeeting(detail);
      setNotice(`Ready to capture "${detail.title}". Click Start when the meeting tab is open.`);
      setError(null);
      setVisibility("expanded");
      setShowRecordingPill(false);
    }
    openIslandFromHash();
    window.addEventListener("hashchange", openIslandFromHash);
    window.addEventListener("nextstop:open-capture-island", handleOpenIsland);
    window.addEventListener("nextstop:capture-target", handleCaptureTarget as EventListener);
    return () => {
      window.removeEventListener("hashchange", openIslandFromHash);
      window.removeEventListener("nextstop:open-capture-island", handleOpenIsland);
      window.removeEventListener("nextstop:capture-target", handleCaptureTarget as EventListener);
    };
  }, []);

  useEffect(() => () => void releaseMedia(), []);

  async function refreshContext() {
    try {
      const response = await fetch("/api/workspace/island/context", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as IslandContext | null;
      if (!response.ok || !payload) return;
      setContext(payload);
    } catch {}
  }

  async function releaseMedia() {
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    mergedStreamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current = null;
    micStreamRef.current = null;
    mergedStreamRef.current = null;
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setTabShared(false);
    setMicLive(false);
    setElapsedSeconds(0);
    const contextValue = audioContextRef.current;
    audioContextRef.current = null;
    if (contextValue) await contextValue.close().catch(() => undefined);
  }

  async function createRecordingSurface() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("This browser does not support tab or window capture.");
    }
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    let hasAudioSource = false;
    if (displayStream.getAudioTracks().length > 0) {
      audioContext.createMediaStreamSource(displayStream).connect(destination);
      hasAudioSource = true;
    }
    if (micStream.getAudioTracks().length > 0) {
      audioContext.createMediaStreamSource(micStream).connect(destination);
      hasAudioSource = true;
    }
    if (!hasAudioSource) {
      displayStream.getTracks().forEach((track) => track.stop());
      micStream.getTracks().forEach((track) => track.stop());
      await audioContext.close().catch(() => undefined);
      throw new Error("No audio source was detected from the selected meeting tab.");
    }
    displayStreamRef.current = displayStream;
    micStreamRef.current = micStream;
    mergedStreamRef.current = destination.stream;
    audioContextRef.current = audioContext;
    setTabShared(displayStream.getVideoTracks().length > 0);
    setMicLive(micStream.getAudioTracks().length > 0);
    const displayTrack = displayStream.getVideoTracks()[0];
    if (displayTrack) {
      displayTrack.addEventListener("ended", () => {
        setTabShared(false);
        if (captureState === "recording" || captureState === "paused") {
          setNotice("Screen sharing stopped. End the session to process what was already captured.");
        }
      });
    }
  }

  async function uploadFinalizeBlob(meeting: ActiveMeetingRef, audioBlob: Blob) {
    const formData = new FormData();
    formData.append("audio", audioBlob, "meeting-capture.webm");
    formData.append("mimeType", audioBlob.type || "audio/webm");
    const response = await fetch(`/api/workspace/meetings/${meeting.id}/finalize`, { method: "POST", body: formData });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Unable to finalize the meeting session.");
  }

  async function resetToIdle(nextNotice?: string | null) {
    retryableFinalizeRef.current = null;
    await releaseMedia();
    setCaptureState("idle");
    setActiveMeeting(null);
    setPendingMeeting(null);
    setError(null);
    setNotice(nextNotice ?? null);
    await refreshContext();
    router.refresh();
  }

  async function handleStart() {
    if (captureState === "recording" || captureState === "paused" || captureState === "processing") return;
    setVisibility("expanded");
    setShowRecordingPill(false);
    setCaptureState("granting");
    setError(null);
    setNotice(null);
    retryableFinalizeRef.current = null;
    try {
      await releaseMedia();
      await createRecordingSurface();
      const meetingTarget = pendingMeeting;
      const title = meetingTarget?.title ?? buildDefaultMeetingTitle();
      const sourceType = meetingTarget?.sourceType ?? "browser_tab";
      const response = await fetch("/api/workspace/meetings/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: meetingTarget?.meetingId, title, sourceType }),
      });
      const payload = (await response.json()) as { error?: string; meetingId?: string; title?: string };
      if (!response.ok || !payload.meetingId) throw new Error(payload.error ?? "Unable to start the browser capture session.");
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(mergedStreamRef.current as MediaStream, { mimeType });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setActiveMeeting({ id: payload.meetingId, title: payload.title ?? title });
      setPendingMeeting(null);
      setElapsedSeconds(0);
      setCaptureState("recording");
      router.refresh();
      await refreshContext();
    } catch (caughtError) {
      await releaseMedia();
      setCaptureState("idle");
      setActiveMeeting(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to start the browser capture session.");
    }
  }

  function handlePauseResume() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (captureState === "recording") {
      recorder.pause();
      setCaptureState("paused");
      return;
    }
    if (captureState === "paused") {
      recorder.resume();
      setCaptureState("recording");
    }
  }

  async function handleEnd() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !activeMeeting) {
      setError("Start a session first before trying to end it.");
      return;
    }
    setVisibility("expanded");
    setShowRecordingPill(false);
    setCaptureState("processing");
    setError(null);
    setNotice(null);
    try {
      const audioBlob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Unable to finish the recording session."));
        recorder.onstop = () =>
          resolve(new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        recorder.stop();
      });
      await uploadFinalizeBlob(activeMeeting, audioBlob);
      await resetToIdle(`Findings are ready for "${activeMeeting.title}" in Library.`);
    } catch (caughtError) {
      const audioBlob = recordedChunksRef.current.length > 0 ? new Blob(recordedChunksRef.current, { type: mediaRecorderRef.current?.mimeType || "audio/webm" }) : null;
      if (audioBlob && audioBlob.size > 0) {
        retryableFinalizeRef.current = { meeting: activeMeeting, blob: audioBlob };
      }
      await releaseMedia();
      setCaptureState("failed");
      setError(caughtError instanceof Error ? caughtError.message : "Unable to finalize the meeting session.");
      setNotice(
        retryableFinalizeRef.current
          ? "We kept the recorded audio in this browser tab. Retry finalize or discard the failed session."
          : "The session ended, but finalization did not complete. Check Library, then start a new capture if needed."
      );
      router.refresh();
    }
  }

  async function handleRetryFinalize() {
    if (!retryableFinalizeRef.current) {
      setError("This session can no longer retry finalization. Start a new capture instead.");
      return;
    }
    setCaptureState("processing");
    setError(null);
    setNotice("Retrying finalization for the captured audio...");
    try {
      const retryPayload = retryableFinalizeRef.current;
      await uploadFinalizeBlob(retryPayload.meeting, retryPayload.blob);
      await resetToIdle(`Findings are ready for "${retryPayload.meeting.title}" in Library.`);
    } catch (caughtError) {
      setCaptureState("failed");
      setError(caughtError instanceof Error ? caughtError.message : "Unable to retry the meeting finalization.");
      setNotice("Retry failed. You can try once more or discard this local session state.");
    }
  }

  async function handleDiscardFailedSession() {
    await resetToIdle(null);
  }

  async function handleInstantGoogleMeet() {
    if (!context.googleConnected) {
      router.push("/dashboard/google");
      return;
    }
    setBusyAction("google");
    setError(null);
    setNotice(null);
    setVisibility("expanded");
    setShowRecordingPill(false);
    try {
      const response = await fetch("/api/workspace/google/instant-meet", { method: "POST" });
      const payload = (await response.json()) as { error?: string; meetingId?: string; googleEventId?: string | null; title?: string; meetUrl?: string | null };
      if (!response.ok || !payload.meetingId) throw new Error(payload.error ?? "Unable to create the instant Google Meet.");
      setPendingMeeting({ meetingId: payload.meetingId, title: payload.title ?? "Instant NextStop meeting", sourceType: "google_meet", googleEventId: payload.googleEventId ?? null, meetUrl: payload.meetUrl ?? null });
      if (payload.meetUrl) window.open(payload.meetUrl, "_blank", "noopener,noreferrer");
      setNotice("Google Meet opened in a new tab. Return here and press Start to capture it.");
      await refreshContext();
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create the instant Google Meet.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSyncToNotion() {
    if (!context.notionConnected) {
      router.push("/dashboard/notion");
      return;
    }
    if (!context.latestCompletedMeeting) {
      setError("Finish a session first to sync findings to Notion.");
      return;
    }
    setBusyAction("notion");
    setError(null);
    setNotice(null);
    setVisibility("expanded");
    setShowRecordingPill(false);
    try {
      const response = await fetch("/api/workspace/meetings/latest/export/notion", { method: "POST" });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to export the latest findings to Notion.");
      setNotice(payload.message ?? "Exported the latest findings to Notion.");
      await refreshContext();
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to export the latest findings to Notion.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleLauncherClick() {
    setVisibility("expanded");
    setShowRecordingPill(false);
    setError(null);
  }

  function handleMinimize() {
    if (typeof window !== "undefined" && window.location.hash === "#workspace-capture-island") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    if (captureState === "processing" || captureState === "failed") {
      setNotice("Keep this panel open until the session is resolved.");
      return;
    }
    if (captureState === "recording" || captureState === "paused") {
      setVisibility("collapsed");
      setShowRecordingPill(true);
      return;
    }
    setVisibility("collapsed");
    setShowRecordingPill(false);
  }

  const canPause = captureState === "recording" || captureState === "paused";
  const canEnd = captureState === "recording" || captureState === "paused";
  const canRetryFinalize = captureState === "failed" && Boolean(retryableFinalizeRef.current);
  const isBusy = captureState === "granting" || captureState === "processing";
  const tabChip = statusChip(tabShared, "Tab shared", "Tab not shared");
  const micChip = statusChip(micLive, "Mic live", "Mic idle");

  if (visibility === "collapsed") {
    return (
      <div className="pointer-events-none fixed right-4 top-6 z-50">
        <div className="flex justify-end">
          {showRecordingPill && activeMeeting ? (
            <button type="button" onClick={handleLauncherClick} className="pointer-events-auto flex max-w-[320px] items-center gap-3 rounded-[1.4rem] border border-white/10 bg-zinc-950/94 px-4 py-3 text-left shadow-[0_24px_80px_-24px_rgba(0,0,0,0.82)] backdrop-blur-2xl" title="Open capture controls">
              <div className="relative">
                <BrandLogoIcon className="h-10 w-10 rounded-xl" />
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-black" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{activeMeeting.title}</p>
                <p className="text-xs text-zinc-400">{captureState === "paused" ? "Paused" : "Recording"} | {formatElapsed(elapsedSeconds)}</p>
              </div>
            </button>
          ) : (
            <button type="button" onClick={handleLauncherClick} className="pointer-events-auto group relative h-[64px] w-[64px] rounded-[1.35rem] border border-white/10 bg-zinc-950/94 p-2.5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.82)] backdrop-blur-2xl transition hover:border-white/20" title="Open capture controls" aria-label="Open capture controls">
              <span className="absolute inset-0 rounded-[1.35rem] bg-[radial-gradient(circle_at_center,rgba(255,184,77,0.18),transparent_70%)] opacity-0 transition group-hover:opacity-100" />
              <BrandLogoIcon className="relative h-[44px] w-[44px] rounded-[1rem]" priority />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed right-4 top-6 z-50">
      <div className="flex justify-end">
        <section id="workspace-capture-island" className="pointer-events-auto w-[156px] rounded-[1.7rem] border border-white/10 bg-zinc-950/94 p-4 shadow-[0_32px_80px_-28px_rgba(0,0,0,0.82)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <BrandLogoIcon className="h-11 w-11 rounded-[1rem]" />
                  {(captureState === "recording" || captureState === "paused") ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-black" /> : null}
                </div>
              </div>
              <button type="button" onClick={handleMinimize} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10" title="Minimize capture controls" aria-label="Minimize capture controls">
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <Button radius="lg" onPress={handleInstantGoogleMeet} isLoading={busyAction === "google"} className="brand-button-secondary h-10 w-full justify-start px-2.5 text-sm font-semibold" startContent={busyAction === "google" ? undefined : <CalendarPlus2 className="h-4 w-4" />}>Google Meet</Button>
              <Button radius="lg" onPress={handleStart} isDisabled={captureState === "recording" || captureState === "paused" || isBusy} className="brand-button-primary h-10 w-full justify-start px-2.5 text-sm font-semibold" startContent={captureState === "granting" ? undefined : <CirclePlay className="h-4 w-4" />}>{captureState === "granting" ? "Starting..." : "Start"}</Button>
              <Button radius="lg" onPress={handlePauseResume} isDisabled={!canPause} className="brand-button-secondary h-10 w-full justify-start px-2.5 text-sm font-semibold" startContent={captureState === "paused" ? <CirclePlay className="h-4 w-4" /> : <CirclePause className="h-4 w-4" />}>{captureState === "paused" ? "Resume" : "Pause"}</Button>
              <Button radius="lg" onPress={handleEnd} isDisabled={!canEnd} isLoading={captureState === "processing"} className="brand-button-secondary h-10 w-full justify-start px-2.5 text-sm font-semibold" startContent={captureState === "processing" ? undefined : <CircleStop className="h-4 w-4" />}>{captureState === "processing" ? "Ending..." : "End"}</Button>
              <Button radius="lg" onPress={handleSyncToNotion} isLoading={busyAction === "notion"} isDisabled={captureState === "processing"} className="brand-button-secondary h-10 w-full justify-start px-2.5 text-sm font-semibold" startContent={busyAction === "notion" ? undefined : <NotebookTabs className="h-4 w-4" />}>Notion</Button>
              {captureState === "failed" ? (
                <>
                  <Button radius="lg" onPress={handleRetryFinalize} isDisabled={!canRetryFinalize} className="brand-button-secondary h-10 w-full justify-start px-2.5 text-sm font-semibold" startContent={<RotateCcw className="h-4 w-4" />}>Retry</Button>
                  <Button radius="lg" onPress={() => void handleDiscardFailedSession()} className="brand-button-secondary h-10 w-full justify-start px-2.5 text-sm font-semibold" startContent={<Trash2 className="h-4 w-4" />}>Discard</Button>
                </>
              ) : null}
            </div>

            <div className="space-y-2 text-xs">
              <div className={`rounded-xl border px-3 py-2 ${tabChip.className}`}>{tabChip.label}</div>
              <div className={`rounded-xl border px-3 py-2 ${micChip.className}`}>{micChip.label}</div>
              <div className={`rounded-xl border px-3 py-2 ${captureState === "processing" ? "border-amber-400/20 bg-amber-400/10 text-amber-50" : captureState === "recording" || captureState === "paused" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : captureState === "failed" ? "border-red-500/20 bg-red-500/10 text-red-100" : "border-white/10 bg-white/5 text-zinc-400"}`}>{captureState === "processing" ? "Processing" : captureState === "failed" ? "Needs attention" : formatElapsed(elapsedSeconds)}</div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-400">
                {captureState === "failed" ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-300" />
                    <span>Resolve failed session</span>
                  </>
                ) : captureState === "processing" ? (
                  <>
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating findings</span>
                  </>
                ) : context.googleConnected ? (
                  <>
                    <Radio className="h-3.5 w-3.5 shrink-0" />
                    <span>Google ready</span>
                  </>
                ) : (
                  <>
                    <Radio className="h-3.5 w-3.5 shrink-0" />
                    <span>Connect Google for instant Meet</span>
                  </>
                )}
              </div>
            </div>

            {notice ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{notice}</div> : null}
            {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
