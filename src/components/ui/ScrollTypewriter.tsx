"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";

export const ScrollTypewriter = ({ 
  text, 
  className = "",
  speed = 15
}: { 
  text: string; 
  className?: string;
  speed?: number;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      let i = 0;
      const intervalId = setInterval(() => {
        setDisplayedText(text.slice(0, i));
        i++;
        if (i > text.length) {
          clearInterval(intervalId);
        }
      }, speed);

      return () => clearInterval(intervalId);
    }
  }, [isInView, text, speed]);

  return (
    <span ref={ref} className={className}>
      {displayedText}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
        className="ml-1 inline-block h-3.5 w-1.5 rounded-sm align-middle"
        style={{ backgroundColor: "var(--brand-highlight)" }}
      />
    </span>
  );
};
