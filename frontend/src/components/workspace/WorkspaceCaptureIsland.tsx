"use client";

import { Button } from "@heroui/react";
import {
  AlertCircle,
  CalendarPlus2,
  CirclePause,
  CirclePlay,
  CircleStop,
  LoaderCircle,
  NotebookTabs,
  Radio,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { resolvePublicApiUrl } from "@/lib/public-backend";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  calculateNormalizedRms,
  getCaptureSelectionError,
  getSilentCaptureError,
} from "@/lib/workspace-capture-audio";

const STORAGE_KEY = "nextstop-workspace-capture-session";

export type WorkspaceCaptureState =
  | "idle"
  | "granting"
  | "recording"
  | "paused"
  | "processing"
  | "failed";

export type MeetingTargetRef = {
  meetingId: string;
  title: string;
  sourceType: "google_meet" | "browser_tab";
  googleEventId?: string | null;
  meetUrl?: string | null;
};

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
  latestScheduledGoogleMeeting: {
    id: string;
    title: string;
    googleEventId: string | null;
    meetUrl: string | null;
  } | null;
  activeMeeting: { id: string; title: string; status: string } | null;
};

type WorkspaceCaptureControllerValue = {
  captureState: WorkspaceCaptureState;
  context: IslandContext;
  elapsedSeconds: number;
  tabShared: boolean;
  micLive: boolean;
  error: string | null;
  notice: string | null;
  activeMeeting: ActiveMeetingRef | null;
  pendingMeeting: MeetingTargetRef | null;
  busyAction: "google" | "notion" | null;
  currentTitle: string | null;
  canPause: boolean;
  canEnd: boolean;
  canRetryFinalize: boolean;
  isBusy: boolean;
  openCaptureControls: () => void;
  setCaptureTarget: (detail: MeetingTargetRef) => void;
  handleStart: () => Promise<void>;
  handlePauseResume: () => void;
  handleEnd: () => Promise<void>;
  handleRetryFinalize: () => Promise<void>;
  handleDiscardFailedSession: () => Promise<void>;
  handleInstantGoogleMeet: () => Promise<void>;
  handleSyncToNotion: () => Promise<void>;
};

const defaultIslandContext: IslandContext = {
  googleConnected: false,
  notionConnected: false,
  latestCompletedMeeting: null,
  latestScheduledGoogleMeeting: null,
  activeMeeting: null,
};

const WorkspaceCaptureControllerContext =
  createContext<WorkspaceCaptureControllerValue | null>(null);

function formatElapsed(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function buildDefaultMeetingTitle() {
  return `Browser Meeting - ${new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())}`;
}

function statusChip(active: boolean, activeLabel: string, inactiveLabel: string) {
  return {
    label: active ? activeLabel : inactiveLabel,
    className: active
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
      : "border-white/10 bg-white/5 text-zinc-400",
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

export function WorkspaceCaptureProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [captureState, setCaptureState] = useState<WorkspaceCaptureState>("idle");
  const [context, setContext] = useState<IslandContext>(defaultIslandContext);
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
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioMonitorIntervalRef = useRef<number | null>(null);
  const peakAudioLevelRef = useRef(0);
  const displayAudioPresentRef = useRef(false);
  const micAudioPresentRef = useRef(false);
  const displaySurfaceRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const retryableFinalizeRef = useRef<RetryableFinalizePayload | null>(null);
  const restoredSessionRef = useRef(false);
  const captureStateRef = useRef<WorkspaceCaptureState>("idle");

  useEffect(() => {
    captureStateRef.current = captureState;
  }, [captureState]);

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
      }
    }
    restoredSessionRef.current = true;
    void refreshContext();
  }, []);

  useEffect(() => {
    if (!restoredSessionRef.current) return;
    writePersistedSession(
      captureState === "idle" &&
        !activeMeeting &&
        !pendingMeeting &&
        !error &&
        !notice
        ? null
        : {
            version: 1,
            captureState,
            elapsedSeconds,
            tabShared,
            micLive,
            error,
            notice,
            activeMeeting,
            pendingMeeting,
          }
    );
  }, [
    activeMeeting,
    captureState,
    elapsedSeconds,
    error,
    micLive,
    notice,
    pendingMeeting,
    tabShared,
  ]);

  useEffect(() => {
    if (captureState !== "recording") return;
    const interval = window.setInterval(
      () => setElapsedSeconds((current) => current + 1),
      1000
    );
    return () => window.clearInterval(interval);
  }, [captureState]);

  useEffect(() => () => void releaseMedia(), []);

  async function refreshContext() {
    try {
      const response = await fetch(resolvePublicApiUrl("/api/workspace/island/context"), {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as IslandContext | null;
      if (!response.ok || !payload) return;
      setContext(payload);
    } catch (caughtError) {
      console.warn("[workspace-capture] Failed to refresh capture context", caughtError);
    }
  }

  async function releaseMedia() {
    if (audioMonitorIntervalRef.current !== null) {
      window.clearInterval(audioMonitorIntervalRef.current);
      audioMonitorIntervalRef.current = null;
    }
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    mergedStreamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current = null;
    micStreamRef.current = null;
    mergedStreamRef.current = null;
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    audioAnalyserRef.current = null;
    peakAudioLevelRef.current = 0;
    displayAudioPresentRef.current = false;
    micAudioPresentRef.current = false;
    displaySurfaceRef.current = null;
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
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (caughtError) {
      console.warn("[workspace-capture] Microphone access was not granted", caughtError);
    }

    const displayTrack = displayStream.getVideoTracks()[0] ?? null;
    const displaySurface =
      typeof displayTrack?.getSettings === "function"
        ? displayTrack.getSettings().displaySurface ?? null
        : null;
    const hasDisplayAudio = displayStream.getAudioTracks().length > 0;
    const hasMicAudio = (micStream?.getAudioTracks().length ?? 0) > 0;
    const captureSelectionError = getCaptureSelectionError({
      displaySurface,
      hasDisplayAudio,
      hasMicAudio,
    });

    if (captureSelectionError) {
      displayStream.getTracks().forEach((track) => track.stop());
      micStream?.getTracks().forEach((track) => track.stop());
      throw new Error(captureSelectionError);
    }

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(destination);
    masterGain.connect(analyser);

    let hasAudioSource = false;
    if (hasDisplayAudio) {
      const displayAudioStream = new MediaStream(displayStream.getAudioTracks());
      audioContext.createMediaStreamSource(displayAudioStream).connect(masterGain);
      hasAudioSource = true;
    }
    if (hasMicAudio && micStream) {
      const micAudioStream = new MediaStream(micStream.getAudioTracks());
      audioContext.createMediaStreamSource(micAudioStream).connect(masterGain);
      hasAudioSource = true;
    }
    if (!hasAudioSource) {
      displayStream.getTracks().forEach((track) => track.stop());
      micStream?.getTracks().forEach((track) => track.stop());
      await audioContext.close().catch(() => undefined);
      throw new Error("No audio source was detected from the selected meeting tab.");
    }
    await audioContext.resume().catch(() => undefined);
    displayStreamRef.current = displayStream;
    micStreamRef.current = micStream;
    mergedStreamRef.current = destination.stream;
    audioContextRef.current = audioContext;
    audioAnalyserRef.current = analyser;
    peakAudioLevelRef.current = 0;
    displayAudioPresentRef.current = hasDisplayAudio;
    micAudioPresentRef.current = hasMicAudio;
    displaySurfaceRef.current = displaySurface;
    setTabShared(hasDisplayAudio);
    setMicLive(hasMicAudio);
    const analyserSamples = new Uint8Array(analyser.fftSize);
    audioMonitorIntervalRef.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(analyserSamples);
      peakAudioLevelRef.current = Math.max(
        peakAudioLevelRef.current,
        calculateNormalizedRms(analyserSamples)
      );
    }, 250);
    if (displayTrack) {
      displayTrack.addEventListener("ended", () => {
        setTabShared(false);
        if (
          captureStateRef.current === "recording" ||
          captureStateRef.current === "paused"
        ) {
          setNotice(
            "Screen sharing stopped. End the session to process what was already captured."
          );
        }
      });
    }
  }

  async function uploadFinalizeBlob(meeting: ActiveMeetingRef, audioBlob: Blob) {
    console.info("[workspace-capture] Preparing upload target", {
      meetingId: meeting.id,
      byteSize: audioBlob.size,
    });
    const uploadResponse = await fetch(
      resolvePublicApiUrl(`/api/workspace/meetings/${meeting.id}/upload-url`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "meeting-capture.webm",
        }),
      }
    );
    const uploadPayload = (await uploadResponse.json()) as {
      error?: string;
      bucket?: string;
      path?: string;
      token?: string;
    };

    if (
      !uploadResponse.ok ||
      !uploadPayload.bucket ||
      !uploadPayload.path ||
      !uploadPayload.token
    ) {
      throw new Error(uploadPayload.error ?? "Unable to prepare the meeting upload.");
    }

    const supabase = createSupabaseBrowserClient();
    const file = new File([audioBlob], "meeting-capture.webm", {
      type: audioBlob.type || "audio/webm",
    });
    const { error: uploadError } = await supabase.storage
      .from(uploadPayload.bucket)
      .uploadToSignedUrl(uploadPayload.path, uploadPayload.token, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    console.info("[workspace-capture] Upload complete, queueing AI processing", {
      meetingId: meeting.id,
      bucket: uploadPayload.bucket,
      path: uploadPayload.path,
    });

    const response = await fetch(
      resolvePublicApiUrl(`/api/workspace/meetings/${meeting.id}/process`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: uploadPayload.bucket,
          path: uploadPayload.path,
          mimeType: file.type || "audio/webm",
          byteSize: file.size,
        }),
      }
    );
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Unable to queue the meeting for transcription.");
    }
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

  function openCaptureControls() {
    setError(null);
  }

  function setCaptureTarget(detail: MeetingTargetRef) {
    setPendingMeeting(detail);
    setNotice(`Ready to capture "${detail.title}". Click Start when the meeting tab is open.`);
    setError(null);
  }

  async function handleStart() {
    if (
      captureState === "recording" ||
      captureState === "paused" ||
      captureState === "processing"
    ) {
      return;
    }
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
      const response = await fetch(resolvePublicApiUrl("/api/workspace/meetings/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: meetingTarget?.meetingId, title, sourceType }),
      });
      const payload = (await response.json()) as {
        error?: string;
        meetingId?: string;
        title?: string;
      };
      if (!response.ok || !payload.meetingId) {
        throw new Error(payload.error ?? "Unable to start the browser capture session.");
      }
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(mergedStreamRef.current as MediaStream, {
        mimeType,
      });
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
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to start the browser capture session."
      );
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
    setCaptureState("processing");
    setError(null);
    setNotice(null);
    try {
      const audioBlob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Unable to finish the recording session."));
        recorder.onstop = () =>
          resolve(
            new Blob(recordedChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            })
          );
        recorder.stop();
      });
      const silentCaptureError = getSilentCaptureError({
        peakLevel: peakAudioLevelRef.current,
        elapsedSeconds,
      });
      if (silentCaptureError) {
        throw new Error(silentCaptureError);
      }
      await uploadFinalizeBlob(activeMeeting, audioBlob);
      await resetToIdle(
        `Transcription started for "${activeMeeting.title}". Review the Library for live status and findings.`
      );
    } catch (caughtError) {
      const shouldPreserveForRetry =
        !(caughtError instanceof Error) ||
        !/No spoken audio was detected/i.test(caughtError.message);
      const audioBlob =
        recordedChunksRef.current.length > 0
          ? new Blob(recordedChunksRef.current, {
              type: mediaRecorderRef.current?.mimeType || "audio/webm",
            })
          : null;
      if (shouldPreserveForRetry && audioBlob && audioBlob.size > 0) {
        retryableFinalizeRef.current = { meeting: activeMeeting, blob: audioBlob };
      } else {
        retryableFinalizeRef.current = null;
      }
      await releaseMedia();
      setCaptureState("failed");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to finalize the meeting session."
      );
      setNotice(
        retryableFinalizeRef.current
          ? "We kept the recorded audio in this browser tab. Retry finalize or discard this local session."
          : "The session ended, but transcription handoff did not complete. Check Library, then start a new capture if needed."
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
    setNotice("Retrying the transcription handoff for the captured audio...");
    try {
      const retryPayload = retryableFinalizeRef.current;
      await uploadFinalizeBlob(retryPayload.meeting, retryPayload.blob);
      await resetToIdle(`Transcription restarted for "${retryPayload.meeting.title}".`);
    } catch (caughtError) {
      setCaptureState("failed");
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to retry the meeting finalization."
      );
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
    try {
      const response = await fetch(resolvePublicApiUrl("/api/workspace/google/instant-meet"), {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        meetingId?: string;
        googleEventId?: string | null;
        title?: string;
        meetUrl?: string | null;
      };
      if (!response.ok || !payload.meetingId) {
        throw new Error(payload.error ?? "Unable to create the instant Google Meet.");
      }
      setPendingMeeting({
        meetingId: payload.meetingId,
        title: payload.title ?? "Instant NextStop meeting",
        sourceType: "google_meet",
        googleEventId: payload.googleEventId ?? null,
        meetUrl: payload.meetUrl ?? null,
      });
      if (payload.meetUrl) {
        window.open(payload.meetUrl, "_blank", "noopener,noreferrer");
      }
      setNotice("Google Meet opened in a new tab. Return here and press Start to capture it.");
      await refreshContext();
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the instant Google Meet."
      );
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
    try {
      const response = await fetch(
        resolvePublicApiUrl("/api/workspace/meetings/latest/export/notion"),
        { method: "POST" }
      );
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to export the latest findings to Notion.");
      }
      setNotice(payload.message ?? "Exported the latest findings to Notion.");
      await refreshContext();
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to export the latest findings to Notion."
      );
    } finally {
      setBusyAction(null);
    }
  }

  const canPause = captureState === "recording" || captureState === "paused";
  const canEnd = captureState === "recording" || captureState === "paused";
  const canRetryFinalize =
    captureState === "failed" && Boolean(retryableFinalizeRef.current);
  const isBusy = captureState === "granting" || captureState === "processing";
  const currentTitle = activeMeeting?.title ?? pendingMeeting?.title ?? null;

  const value: WorkspaceCaptureControllerValue = {
    captureState,
    context,
    elapsedSeconds,
    tabShared,
    micLive,
    error,
    notice,
    activeMeeting,
    pendingMeeting,
    busyAction,
    currentTitle,
    canPause,
    canEnd,
    canRetryFinalize,
    isBusy,
    openCaptureControls,
    setCaptureTarget,
    handleStart,
    handlePauseResume,
    handleEnd,
    handleRetryFinalize,
    handleDiscardFailedSession,
    handleInstantGoogleMeet,
    handleSyncToNotion,
  };

  return (
    <WorkspaceCaptureControllerContext.Provider value={value}>
      {children}
    </WorkspaceCaptureControllerContext.Provider>
  );
}

export function useWorkspaceCaptureController() {
  const value = useContext(WorkspaceCaptureControllerContext);

  if (!value) {
    throw new Error(
      "useWorkspaceCaptureController must be used inside WorkspaceCaptureProvider."
    );
  }

  return value;
}

export function WorkspaceCaptureSidebarPanel({
  className = "",
}: {
  className?: string;
}) {
  const {
    captureState,
    context,
    elapsedSeconds,
    tabShared,
    micLive,
    error,
    notice,
    busyAction,
    currentTitle,
    canPause,
    canEnd,
    canRetryFinalize,
    isBusy,
    handleStart,
    handlePauseResume,
    handleEnd,
    handleRetryFinalize,
    handleDiscardFailedSession,
    handleInstantGoogleMeet,
    handleSyncToNotion,
  } = useWorkspaceCaptureController();

  const tabChip = statusChip(tabShared, "Tab audio live", "Tab audio missing");
  const micChip = statusChip(micLive, "Mic live", "Mic idle");

  return (
    <section
      className={`rounded-[1.5rem] border border-white/10 bg-black/25 p-3 backdrop-blur-xl ${className}`.trim()}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Button
            radius="lg"
            onPress={handleInstantGoogleMeet}
            isLoading={busyAction === "google"}
            className="brand-button-secondary h-10 w-full justify-start px-3 text-sm font-semibold"
            startContent={
              busyAction === "google" ? undefined : <CalendarPlus2 className="h-4 w-4" />
            }
          >
            Google Meet
          </Button>
          <Button
            radius="lg"
            onPress={handleStart}
            isDisabled={captureState === "recording" || captureState === "paused" || isBusy}
            className="brand-button-primary h-10 w-full justify-start px-3 text-sm font-semibold"
            startContent={
              captureState === "granting" ? undefined : <CirclePlay className="h-4 w-4" />
            }
          >
            {captureState === "granting" ? "Starting..." : "Start"}
          </Button>
          <Button
            radius="lg"
            onPress={handlePauseResume}
            isDisabled={!canPause}
            className="brand-button-secondary h-10 w-full justify-start px-3 text-sm font-semibold"
            startContent={
              captureState === "paused" ? (
                <CirclePlay className="h-4 w-4" />
              ) : (
                <CirclePause className="h-4 w-4" />
              )
            }
          >
            {captureState === "paused" ? "Resume" : "Pause"}
          </Button>
          <Button
            radius="lg"
            onPress={handleEnd}
            isDisabled={!canEnd}
            isLoading={captureState === "processing"}
            className="brand-button-secondary h-10 w-full justify-start px-3 text-sm font-semibold"
            startContent={
              captureState === "processing" ? undefined : <CircleStop className="h-4 w-4" />
            }
          >
            {captureState === "processing" ? "Ending..." : "End"}
          </Button>
          <Button
            radius="lg"
            onPress={handleSyncToNotion}
            isLoading={busyAction === "notion"}
            isDisabled={captureState === "processing"}
            className="brand-button-secondary h-10 w-full justify-start px-3 text-sm font-semibold"
            startContent={
              busyAction === "notion" ? undefined : <NotebookTabs className="h-4 w-4" />
            }
          >
            Notion
          </Button>
          {captureState === "failed" ? (
            <>
              <Button
                radius="lg"
                onPress={handleRetryFinalize}
                isDisabled={!canRetryFinalize}
                className="brand-button-secondary h-10 w-full justify-start px-3 text-sm font-semibold"
                startContent={<RotateCcw className="h-4 w-4" />}
              >
                Retry
              </Button>
              <Button
                radius="lg"
                onPress={() => void handleDiscardFailedSession()}
                className="brand-button-secondary h-10 w-full justify-start px-3 text-sm font-semibold"
                startContent={<Trash2 className="h-4 w-4" />}
              >
                Discard
              </Button>
            </>
          ) : null}
        </div>

        {currentTitle ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
            {currentTitle}
          </div>
        ) : null}

        <div className="space-y-2 text-xs">
          <div className={`rounded-xl border px-3 py-2 ${tabChip.className}`}>
            {tabChip.label}
          </div>
          <div className={`rounded-xl border px-3 py-2 ${micChip.className}`}>
            {micChip.label}
          </div>
          <div
            className={`rounded-xl border px-3 py-2 ${
              captureState === "processing"
                ? "border-amber-400/20 bg-amber-400/10 text-amber-50"
                : captureState === "recording" || captureState === "paused"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                  : captureState === "failed"
                    ? "border-red-500/20 bg-red-500/10 text-red-100"
                    : "border-white/10 bg-white/5 text-zinc-400"
            }`}
          >
            {captureState === "processing"
              ? "Processing"
              : captureState === "failed"
                ? "Needs attention"
                : formatElapsed(elapsedSeconds)}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-zinc-400">
            {captureState === "failed" ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-300" />
                <span>Resolve failed session</span>
              </>
            ) : captureState === "processing" ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading and queueing transcription</span>
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

        {notice ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function WorkspaceCaptureIsland() {
  return (
    <WorkspaceCaptureProvider>
      <div className="max-w-xs">
        <WorkspaceCaptureSidebarPanel />
      </div>
    </WorkspaceCaptureProvider>
  );
}
