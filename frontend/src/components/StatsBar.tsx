"use client";

import { motion } from "framer-motion";
import { Mic, ArrowRight, ShieldOff, Timer } from "lucide-react";
import React from "react";

import { AnimatedCounter } from "./ui/AnimatedCounter";

const stats = [
  {
    icon: <Mic className="h-5 w-5" />,
    target: 100,
    suffix: "%",
    label: "Local Audio",
    color: "var(--brand-primary)",
  },
  {
    icon: <ArrowRight className="h-5 w-5" />,
    target: 3,
    suffix: "",
    label: "Step Workflow",
    color: "var(--brand-highlight)",
  },
  {
    icon: <ShieldOff className="h-5 w-5" />,
    target: 0,
    suffix: "",
    label: "Cloud Keys Exposed",
    color: "var(--brand-trust)",
  },
  {
    icon: <Timer className="h-5 w-5" />,
    target: 2,
    suffix: "s",
    prefix: "< ",
    label: "Post-Meeting Queue",
    color: "var(--brand-support)",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

export function StatsBar() {
  return (
    <section className="border-t border-white/5 py-16">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="container mx-auto grid grid-cols-2 gap-8 px-4 md:grid-cols-4 md:px-6"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            className="flex flex-col items-center text-center"
          >
            <div
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in srgb, ${stat.color} 16%, transparent)`,
                color: stat.color,
              }}
            >
              {stat.icon}
            </div>
            <AnimatedCounter
              target={stat.target}
              suffix={stat.suffix}
              prefix={stat.prefix || ""}
            />
            <span className="mt-1 text-sm text-zinc-500">{stat.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
