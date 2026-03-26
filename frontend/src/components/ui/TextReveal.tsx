"use client";

import { motion, type Variants } from "framer-motion";
import React, { useMemo } from "react";

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

// Pre-create motion components outside render to avoid reset on every render
const motionComponents = {
  h1: motion.create("h1"),
  h2: motion.create("h2"),
  h3: motion.create("h3"),
  h4: motion.create("h4"),
  span: motion.create("span"),
};

/**
 * Word-by-word text reveal animation on scroll.
 * Splits the text prop into words and staggers them in.
 */
export function TextReveal({
  text,
  className = "",
  as: Component = "h2",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "span";
}) {
  const MotionComponent = motionComponents[Component];
  const words = useMemo(() => text.split(" "), [text]);

  return (
    <MotionComponent
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      className={className}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordVariants}
          className="inline-block"
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
