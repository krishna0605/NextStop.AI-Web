import { describe, expect, it } from "vitest";

import {
  MIN_CAPTURE_AUDIO_PEAK,
  calculateNormalizedRms,
  getCaptureSelectionError,
  getSilentCaptureError,
} from "@/lib/workspace-capture-audio";

describe("workspace capture audio helpers", () => {
  it("returns zero rms for a silent waveform", () => {
    expect(calculateNormalizedRms(new Uint8Array([128, 128, 128, 128]))).toBe(0);
  });

  it("flags non-browser capture surfaces and missing tab audio", () => {
    expect(
      getCaptureSelectionError({
        displaySurface: "window",
        hasDisplayAudio: true,
        hasMicAudio: true,
      })
    ).toContain("meeting browser tab");

    expect(
      getCaptureSelectionError({
        displaySurface: "browser",
        hasDisplayAudio: false,
        hasMicAudio: true,
      })
    ).toContain("Share tab audio");

    expect(
      getCaptureSelectionError({
        displaySurface: "browser",
        hasDisplayAudio: true,
        hasMicAudio: false,
      })
    ).toBeNull();
  });

  it("flags silent captures and allows audible ones", () => {
    expect(
      getSilentCaptureError({
        peakLevel: MIN_CAPTURE_AUDIO_PEAK / 4,
        elapsedSeconds: 12,
      })
    ).toContain("No spoken audio was detected");

    expect(
      getSilentCaptureError({
        peakLevel: MIN_CAPTURE_AUDIO_PEAK + 0.01,
        elapsedSeconds: 12,
      })
    ).toBeNull();
  });
});
