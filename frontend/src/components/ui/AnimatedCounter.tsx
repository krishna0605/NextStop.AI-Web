"use client";

import { useInView, useMotionValue, useSpring, motion } from "framer-motion";
import React, { useEffect, useRef } from "react";

/**
 * Animated counter that counts up from 0 to target when scrolled into view.
 */
export function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
  duration = 1.5,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 80,
    damping: 25,
    duration: duration * 1000,
  });
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(target);
    }
  }, [isInView, motionValue, target]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) {
        const rounded = target % 1 === 0 ? Math.round(latest) : latest.toFixed(1);
        ref.current.textContent = `${prefix}${rounded}${suffix}`;
      }
    });
    return unsubscribe;
  }, [spring, prefix, suffix, target]);

  return (
    <motion.span
      ref={ref}
      className="font-heading text-4xl font-bold tracking-tight text-white md:text-5xl"
    >
      {prefix}0{suffix}
    </motion.span>
  );
}
