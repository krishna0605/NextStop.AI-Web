"use client";

import React, { useEffect, useRef, useState } from "react";

interface CurvedConnectorProps {
  /** Direction the arrow flows: down-left-to-right or down-right-to-left */
  direction: "left-to-right" | "right-to-left";
  className?: string;
}

/**
 * SVG connector that draws a right-angle curved arrow between zigzag blocks.
 * Uses IntersectionObserver to pause the animateMotion when off-screen.
 */
export function CurvedConnector({ direction, className = "" }: CurvedConnectorProps) {
  const isLTR = direction === "left-to-right";
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "100px 0px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const path = isLTR
    ? "M 80 0 L 80 50 Q 80 70 100 70 L 380 70 Q 400 70 400 90 L 400 120"
    : "M 400 0 L 400 50 Q 400 70 380 70 L 100 70 Q 80 70 80 90 L 80 120";

  const arrowX = isLTR ? 400 : 80;

  return (
    <div ref={ref} className={`hidden md:flex justify-center items-center py-2 ${className}`}>
      <svg
        viewBox="0 0 480 140"
        fill="none"
        className="w-full max-w-2xl h-[90px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            id={`connector-grad-${direction}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="var(--brand-highlight)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--brand-trust)" stopOpacity="0.5" />
          </linearGradient>

          {/* Glow filter */}
          <filter id={`glow-${direction}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main connector path */}
        <path
          d={path}
          stroke={`url(#connector-grad-${direction})`}
          strokeWidth="1.5"
          strokeLinecap="round"
          filter={`url(#glow-${direction})`}
        />

        {/* Arrowhead */}
        <polygon
          points={`${arrowX - 5},112 ${arrowX + 5},112 ${arrowX},124`}
          fill="var(--brand-highlight)"
          opacity="0.8"
        />

        {/* Animated pulse dot — only animates when in viewport */}
        {visible && (
          <circle r="3" fill="var(--brand-highlight)" opacity="0.9">
            <animateMotion dur="3s" repeatCount="indefinite" path={path} />
          </circle>
        )}
      </svg>
    </div>
  );
}

/** Simple vertical dot connector for mobile stacking */
export function MobileConnector() {
  return (
    <div className="flex md:hidden justify-center py-4">
      <div className="flex flex-col items-center gap-1">
        <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, rgb(var(--brand-primary-rgb) / 0.4), rgb(var(--brand-highlight-rgb) / 0.6))" }} />
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <polygon points="1,0 11,0 6,8" fill="var(--brand-highlight)" opacity="0.7" />
        </svg>
      </div>
    </div>
  );
}
