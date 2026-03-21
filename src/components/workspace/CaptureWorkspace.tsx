"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { CirclePause, CirclePlay, CircleStop, MonitorUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { MeetingSourceType, WebMeetingRecord } from "@/lib/workspace";
import { MEETING_SOURCE_LABELS } from "@/lib/workspace";

type CaptureState =
  | "idle"
  | "granting"
  | "granted"
  | "recording"
  | "paused"
  | "processing";

function formatElapsed(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function statusTone(active: boolean) {
  return active
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
    : "border-white/10 bg-white/5 text-zinc-400";
}

export function CaptureWorkspace({
  meeting,
  providerStatus,
}: {
  meeting: WebMeetingRecord | null;
  providerStatus: {
    deepgramConfigured: boolean;
    openAiConfigured: boolean;
  };
}) {
  const router = useRouter();
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [grantedSurfaceLabel, setGrantedSurfaceLabel] = useState<string | null>(null);
  const [tabShared, setTabShared] = useState(false);
  const [micLive, setMicLive] = useState(false);

  const displayStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mergedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (captureState !== "recording") {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [captureState]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      mergedStreamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, []);

  const sourceLabel = useMemo(() => {
    const sourceType = (meeting?.source_type ?? "browser_tab") as MeetingSourceType;
    return MEETING_SOURCE_LABELS[sourceType];
  }, [meeting?.source_type]);

  async function grantCapture() {
    setCaptureState("granting");
    setError(null);

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("This browser does not expose the required capture APIs.");
      }

      displayStreamRef.current?.getTracks().forEach((track) => track.stop());
      micStreamRef.current?.getTracks().forEach((track) => track.stop());
      mergedStreamRef.current?.getTracks().forEach((track) => track.stop());
      await audioContextRef.current?.close();

      const displayStream =
        meeting?.source_type === "quick_notes"
          ? null
          : await navigator.mediaDevices.getDisplayMedia({
              audio: true,
              video: true,
            });

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      let hasAudio = false;

      if (displayStream && displayStream.getAudioTracks().length > 0) {
        const displayAudioSource = audioContext.createMediaStreamSource(displayStream);
        displayAudioSource.connect(destination);
        hasAudio = true;
      }

      if (micStream.getAudioTracks().length > 0) {
        const micAudioSource = audioContext.createMediaStreamSource(micStream);
        micAudioSource.connect(destination);
        hasAudio = true;
      }

      if (!hasAudio) {
        throw new Error("No audio source is available from the selected capture.");
      }

      displayStreamRef.current = displayStream;
      micStreamRef.current = micStream;
      mergedStreamRef.current = destination.stream;
      audioContextRef.current = audioContext;

      const displayTrack = displayStream?.getVideoTracks?.()[0] ?? null;
      const grantedLabel =
        displayTrack?.label || (meeting?.source_type === "quick_notes" ? "Microphone only" : "Shared tab");

      setGrantedSurfaceLabel(grantedLabel);
      setTabShared(Boolean(displayStream));
      setMicLive(micStream.getAudioTracks().length > 0);
      setCaptureState("granted");
      setElapsedSeconds(0);

      displayTrack?.addEventListener("ended", () => {
        if (captureState === "recording" || captureState === "paused" || captureState === "granted") {
          void stopTracksAndReset();
        }
      });
    } catch (caughtError) {
      await stopTracksAndReset();
      setCaptureState("idle");
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to grant browser capture."
      );
    }
  }

  async function stopTracksAndReset() {
    mediaRecorderRef.current = null;
    displayStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    mergedStreamRef.current?.getTracks().forEach((track) => track.stop());
    displayStreamRef.current = null;
    micStreamRef.current = null;
    mergedStreamRef.current = null;
    recordedChunksRef.current = [];
    setTabShared(false);
    setMicLive(false);
    setGrantedSurfaceLabel(null);
    setElapsedSeconds(0);
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context) {
      await context.close().catch(() => undefined);
    }
  }

  function startSession() {
    if (!meeting) {
      setError("Create a meeting from the dashboard before opening the capture page.");
      return;
    }

    if (!mergedStreamRef.current) {
      setError("Grant capture first.");
      return;
    }

    setError(null);
    recordedChunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(mergedStreamRef.current, { mimeType });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setElapsedSeconds(0);
    setCaptureState("recording");
  }

  function togglePauseResume() {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

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

  async function endSession() {
    if (!meeting) {
      setError("No meeting record was selected for this session.");
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      setError("Start a session before ending it.");
      return;
    }

    setCaptureState("processing");
    setError(null);

    try {
      const audioBlob = await new Promise<Blob>((resolve, reject) => {
        recorder.onerror = () => reject(new Error("Unable to finish the recording session."));
        recorder.onstop = () => {
          resolve(new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        };
        recorder.stop();
      });

      const formData = new FormData();
      formData.append("audio", audioBlob, "meeting-capture.webm");
      formData.append("mimeType", audioBlob.type || "audio/webm");

      const response = await fetch(`/api/workspace/meetings/${meeting.id}/finalize`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to finalize the session.");
      }

      await stopTracksAndReset();
      router.push(`/dashboard/review/${meeting.id}`);
      router.refresh();
    } catch (caughtError) {
      setCaptureState("granted");
      setError(
        caughtError instanceof Error ? caughtError.message : "Unable to finalize the session."
      );
    }
  }

  if (!meeting) {
    return (
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-8 text-center"
        >
          <div className="brand-chip mb-4 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium">
            <Sparkles className="mr-2 h-4 w-4" />
            Capture Workspace
          </div>
          <h1 className="text-3xl font-bold text-white">No meeting selected</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Start from the dashboard or Google workspace first, then open capture for that meeting.
          </p>
          <div className="mt-8">
            <Link href="/dashboard">
              <Button radius="full" className="brand-button-primary h-12 px-8 font-semibold">
                Go to dashboard
              </Button>
            </Link>
          </div>
        </motion.section>
      </div>
    );
  }

  const canStart = captureState === "granted";
  const canPause = captureState === "recording" || captureState === "paused";
  const canEnd = captureState === "recording" || captureState === "paused";

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="brand-chip mb-4 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium">
              <Sparkles className="mr-2 h-4 w-4" />
              Capture Workspace
            </div>
            <h1 className="text-3xl font-bold text-white">{meeting.title}</h1>
            <p className="mt-2 text-sm text-zinc-400">Source: {sourceLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs ${statusTone(tabShared)}`}>
              {tabShared ? "Tab shared" : "Tab not shared"}
            </span>
            <span className={`rounded-full border px-3 py-1.5 text-xs ${statusTone(micLive)}`}>
              {micLive ? "Mic live" : "Mic not ready"}
            </span>
            <span
              className={`rounded-full border px-3 py-1.5 text-xs ${
                captureState === "processing"
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-50"
                  : statusTone(captureState === "recording" || captureState === "paused")
              }`}
            >
              {captureState === "processing" ? "Processing" : formatElapsed(elapsedSeconds)}
            </span>
          </div>
        </div>
      </motion.section>

      {error ? (
        <section className="rounded-[2rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="mx-auto max-w-4xl rounded-[2.4rem] border border-white/10 bg-zinc-950/70 p-6"
      >
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-8 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Capture controller</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {captureState === "recording"
                ? "Session is live"
                : captureState === "paused"
                  ? "Session paused"
                  : captureState === "processing"
                    ? "Generating findings"
                    : captureState === "granted"
                      ? "Ready to start"
                      : "Grant capture to begin"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {grantedSurfaceLabel
                ? `Selected surface: ${grantedSurfaceLabel}`
                : "Choose the browser tab or window you want to capture. After granting access, use the controller below to start, pause, and end the meeting."}
            </p>
          </div>

          <div className="w-full max-w-3xl rounded-full border border-white/10 bg-black/20 p-4 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)]">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                radius="full"
                onPress={grantCapture}
                isDisabled={captureState === "granting" || captureState === "processing"}
                className="brand-button-secondary h-12 min-w-[170px] font-semibold"
                startContent={<MonitorUp className="h-4 w-4" />}
              >
                {captureState === "granting" ? "Granting..." : "Grant capture"}
              </Button>

              <Button
                radius="full"
                onPress={startSession}
                isDisabled={!canStart}
                className="brand-button-primary h-12 min-w-[160px] font-semibold"
                startContent={<CirclePlay className="h-4 w-4" />}
              >
                Start session
              </Button>

              <Button
                radius="full"
                onPress={togglePauseResume}
                isDisabled={!canPause}
                className="brand-button-secondary h-12 min-w-[150px] font-semibold"
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
                radius="full"
                onPress={endSession}
                isDisabled={!canEnd}
                isLoading={captureState === "processing"}
                className="brand-button-secondary h-12 min-w-[170px] font-semibold"
                startContent={captureState === "processing" ? undefined : <CircleStop className="h-4 w-4" />}
              >
                {captureState === "processing" ? "Ending..." : "End session"}
              </Button>
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            Deepgram: {providerStatus.deepgramConfigured ? "ready" : "missing"} • OpenAI:{" "}
            {providerStatus.openAiConfigured ? "ready" : "missing"}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
