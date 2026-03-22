"use client";

import { useEffect, useState } from "react";

type AmbientTone = "warm" | "trust";

type AmbientState = {
  active: boolean;
  tone: AmbientTone;
  x: number;
  y: number;
};

const initialState: AmbientState = {
  active: false,
  tone: "warm",
  x: 50,
  y: 32,
};

export function AmbientBackground() {
  const [state, setState] = useState<AmbientState>(initialState);

  useEffect(() => {
    const handleFocus = (event: Event) => {
      const detail = (event as CustomEvent<Partial<AmbientState>>).detail;
      setState({
        active: true,
        tone: detail.tone === "trust" ? "trust" : "warm",
        x: typeof detail.x === "number" ? detail.x : 50,
        y: typeof detail.y === "number" ? detail.y : 32,
      });
    };

    const handleClear = () => {
      setState((current) => ({ ...current, active: false }));
    };

    window.addEventListener("nextstop:ambient-focus", handleFocus as EventListener);
    window.addEventListener("nextstop:ambient-clear", handleClear);

    return () => {
      window.removeEventListener(
        "nextstop:ambient-focus",
        handleFocus as EventListener
      );
      window.removeEventListener("nextstop:ambient-clear", handleClear);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-50 overflow-hidden">
      <div className="ambient-base-layer" />
      <div className="ambient-grid-layer" />
      <div className="ambient-blob ambient-blob-warm ambient-float-a" />
      <div className="ambient-blob ambient-blob-trust ambient-float-b" />
      <div className="ambient-blob ambient-blob-support ambient-float-c" />
      <div
        className={`ambient-focus ${state.active ? "ambient-focus-visible" : ""}`}
        data-tone={state.tone}
        style={{
          left: `${state.x}%`,
          top: `${state.y}%`,
        }}
      />
    </div>
  );
}
