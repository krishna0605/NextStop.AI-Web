"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRef } from "react";

const toneGlow = {
  warm: {
    accent: "242 129 69",
    overlay:
      "linear-gradient(135deg, rgb(var(--brand-primary-rgb) / 0.12), transparent 45%, rgb(var(--brand-highlight-rgb) / 0.06))",
  },
  trust: {
    accent: "80 103 184",
    overlay:
      "linear-gradient(135deg, rgb(var(--brand-trust-rgb) / 0.12), transparent 45%, rgb(var(--brand-highlight-rgb) / 0.05))",
  },
} as const;

export const GlowingMouseCard = ({
  children,
  className = "",
  tone = "warm",
}: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof toneGlow;
}) => {
  const glow = toneGlow[tone];
  const ref = useRef<HTMLDivElement>(null);

  const focusAmbient = () => {
    const rect = ref.current?.getBoundingClientRect();

    window.dispatchEvent(
      new CustomEvent("nextstop:ambient-focus", {
        detail: {
          tone,
          x: rect ? ((rect.left + rect.width / 2) / window.innerWidth) * 100 : 50,
          y: rect ? ((rect.top + rect.height / 2) / window.innerHeight) * 100 : 38,
        },
      })
    );
  };

  const clearAmbient = () => {
    window.dispatchEvent(new CustomEvent("nextstop:ambient-clear"));
  };

  return (
    <div
      ref={ref}
      className={`brand-card-hover group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-950/60 p-px ${className}`}
      style={{ "--card-accent-rgb": glow.accent } as CSSProperties}
      onMouseEnter={focusAmbient}
      onMouseLeave={clearAmbient}
      onFocus={focusAmbient}
      onBlur={clearAmbient}
    >
      <div className="relative z-10 flex h-full w-full flex-col justify-between overflow-hidden rounded-xl bg-zinc-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow.overlay }}
        />
        {children}
      </div>
    </div>
  );
};
