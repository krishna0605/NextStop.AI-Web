"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import React from "react";

/**
 * Thin gradient bar fixed at the top of the viewport showing scroll progress.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left"
      style={{
        scaleX,
        backgroundImage:
          "linear-gradient(90deg, var(--brand-primary), var(--brand-highlight), var(--brand-trust))",
      }}
    />
  );
}
