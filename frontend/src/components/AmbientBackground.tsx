"use client";

import { useEffect, useRef, useState } from "react";

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

// Reduced from 10 → 5 particles for performance
const particles = [
  { className: "particle-warm", style: { left: "12%", top: "18%", animation: "particle-drift-1 28s ease-in-out infinite" } },
  { className: "particle-trust", style: { left: "78%", top: "24%", animation: "particle-drift-2 34s ease-in-out infinite" } },
  { className: "particle-highlight", style: { left: "45%", top: "62%", animation: "particle-drift-3 22s ease-in-out infinite" } },
  { className: "particle-warm", style: { left: "88%", top: "72%", animation: "particle-drift-1 30s ease-in-out infinite reverse" } },
  { className: "particle-trust", style: { left: "22%", top: "85%", animation: "particle-drift-2 38s ease-in-out infinite" } },
];

export function AmbientBackground() {
  const [state, setState] = useState<AmbientState>(initialState);
  const containerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

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

  // Pause CSS animations when user scrolls far past the hero
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setPaused(!entry.isIntersecting);
      },
      { rootMargin: "200% 0px 200% 0px" }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const pauseStyle = paused ? { animationPlayState: "paused" as const } : undefined;

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 -z-50 overflow-hidden">
      <div className="ambient-base-layer" />
      <div className="ambient-grid-layer" />
      <div className="ambient-blob ambient-blob-warm ambient-float-a" style={pauseStyle} />
      <div className="ambient-blob ambient-blob-trust ambient-float-b" style={pauseStyle} />
      <div className="ambient-blob ambient-blob-support ambient-float-c" style={pauseStyle} />
      {/* Extra mesh blobs */}
      <div
        className="ambient-blob ambient-float-d"
        style={{
          ...pauseStyle,
          background: "radial-gradient(circle, rgb(var(--brand-highlight-rgb) / 0.08) 0%, transparent 70%)",
          width: "40vw",
          height: "40vw",
          top: "60%",
          left: "10%",
          position: "absolute",
          borderRadius: "50%",
          filter: "blur(80px)",
        }}
      />
      <div
        className="ambient-blob ambient-float-e"
        style={{
          ...pauseStyle,
          background: "radial-gradient(circle, rgb(var(--brand-primary-rgb) / 0.06) 0%, transparent 70%)",
          width: "35vw",
          height: "35vw",
          top: "20%",
          right: "5%",
          position: "absolute",
          borderRadius: "50%",
          filter: "blur(90px)",
        }}
      />
      {/* Floating accent particles (reduced to 5) */}
      {particles.map((p, i) => (
        <span
          key={i}
          className={`particle ${p.className}`}
          style={{ ...p.style, ...(pauseStyle ?? {}) }}
        />
      ))}
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
