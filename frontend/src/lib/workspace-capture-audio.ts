export const MIN_CAPTURE_AUDIO_PEAK = 0.015;

export function calculateNormalizedRms(samples: Uint8Array) {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;

  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sumSquares += normalized * normalized;
  }

  return Math.sqrt(sumSquares / samples.length);
}

export function getCaptureSelectionError(args: {
  displaySurface: string | null;
  hasDisplayAudio: boolean;
  hasMicAudio: boolean;
}) {
  if (args.displaySurface && args.displaySurface !== "browser") {
    return "Select the meeting browser tab instead of a window or screen so tab audio can be captured reliably.";
  }

  if (!args.hasDisplayAudio) {
    return "No meeting audio was detected from the shared tab. Choose the meeting tab itself and turn on \"Share tab audio\" before starting.";
  }

  if (!args.hasMicAudio) {
    return null;
  }

  return null;
}

export function getSilentCaptureError(args: {
  peakLevel: number;
  elapsedSeconds: number;
}) {
  if (args.peakLevel >= MIN_CAPTURE_AUDIO_PEAK) {
    return null;
  }

  const durationHint =
    args.elapsedSeconds >= 3 ? ` over ${args.elapsedSeconds} seconds` : "";

  return `No spoken audio was detected in this recording${durationHint}. Make sure the meeting tab is audible, \"Share tab audio\" is enabled, and someone speaks before ending the capture.`;
}
