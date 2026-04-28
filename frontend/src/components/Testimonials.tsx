"use client";

import { motion, type Variants } from "framer-motion";
import React from "react";

/* ── Testimonial data ────────────────────────────────────────── */

type Testimonial = {
  quote: string;
  name?: string;
  role?: string;
  /** Which column (1–3) */
  col: 1 | 2 | 3;
  /** "full" = quote + divider + author, "compact" = quote only */
  variant: "full" | "compact";
};

const testimonials: Testimonial[] = [
  /* ── column 1 ───────────────────────────────────────── */
  {
    quote:
      "The session launcher fixed our old 'start recording and clean it up later' habit. We now set the title, tag, and Notion destination before anyone joins.",
    name: "Maya Patel",
    role: "Product Operations Lead",
    col: 1,
    variant: "full",
  },
  {
    quote:
      "Canonical markdown plus Notion sync means I always have a clean page, a local artifact, and a retry path if anything fails.",
    col: 1,
    variant: "compact",
  },
  {
    quote:
      "Set up the session, run the call, review the summary — done. No more chasing notes across three different tools.",
    col: 1,
    variant: "compact",
  },
  /* ── column 2 ───────────────────────────────────────── */
  {
    quote:
      "What sold me was the review flow. If the draft is weak, I regenerate just the draft instead of rerunning the whole meeting. It's like pair programming with someone who knows your whole context.",
    name: "Ethan Brooks",
    role: "Engineering Manager",
    col: 2,
    variant: "full",
  },
  {
    quote:
      "The related-meeting memory finally ties our recurring release calls together. The summary knows what was decided last week without me pasting context.",
    name: "Jordan Lee",
    role: "Technical Program Manager",
    col: 2,
    variant: "full",
  },
  {
    quote:
      "Speaker labels that survive through summary, export, and sync make everything downstream cleaner.",
    col: 2,
    variant: "compact",
  },
  /* ── column 3 ───────────────────────────────────────── */
  {
    quote:
      "The Google Meet path is exactly what we needed. I can create the event, open the call, and still keep the local recording flow under one roof. The precision is unmatched — it gets the context right every time. Game changer.",
    name: "Nadia Khan",
    role: "Program Lead",
    col: 3,
    variant: "full",
  },
  {
    quote:
      "Post-meeting AI running through a secure gateway instead of live-streaming audio to a cloud model? That's the approach I've been waiting for.",
    name: "Arjun Desai",
    role: "Security Architect",
    col: 3,
    variant: "full",
  },
  {
    quote:
      "One artifact, one retry path, one source of truth. Exactly what our team needed.",
    col: 3,
    variant: "compact",
  },
];

/* ── Animation variants ──────────────────────────────────────── */

const premiumEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: premiumEase },
  },
};

/* ── Card component — matches Framer Exact structure ─────────── */

function TestimonialCard({ item }: { item: Testimonial }) {
  const isFull = item.variant === "full" && item.name;

  return (
    <motion.div
      variants={cardReveal}
      className="flex flex-col gap-4 overflow-hidden rounded-lg"
      style={{
        backgroundColor: "rgb(18, 18, 18)",
        padding: 24,
      }}
    >
      {/* Quote */}
      <p className="text-[15px] leading-[1.7] text-white">{item.quote}</p>

      {/* Divider + Author (full variant only) */}
      {isFull && (
        <div
          className="flex items-end gap-3 pt-4"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.16)" }}
        >
          {/* Avatar — gradient initials matching brand colors */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-black"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-highlight) 100%)",
            }}
          >
            {item.name!
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </div>
          <div className="flex flex-col gap-[2px]">
            <p className="text-sm font-medium text-white">{item.name}</p>
            <p className="text-xs text-[rgb(133,133,133)]">{item.role}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ── Section ──────────────────────────────────────────────────── */

export function Testimonials() {
  const col1 = testimonials.filter((t) => t.col === 1);
  const col2 = testimonials.filter((t) => t.col === 2);
  const col3 = testimonials.filter((t) => t.col === 3);

  return (
    <section id="testimonials" className="relative bg-transparent py-14">
      {/* Header */}
      <div className="container relative z-10 mx-auto mb-10 px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: premiumEase }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 text-sm font-medium tracking-[0.2em] text-zinc-500">
            {"// Testimonials"}
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-[2.75rem] md:leading-[1.15]">
            Trusted by teams.{" "}
            <span className="text-[rgb(133,133,133)]">
              Built for clean follow-up.
            </span>
          </h2>
        </motion.div>
      </div>

      {/* Bento grid — exact Framer structure: 3-col, gap 12px, bottom fade mask */}
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="mx-auto grid max-w-[1128px] grid-cols-1 gap-3 md:grid-cols-3"
          style={{
            maskImage:
              "linear-gradient(to bottom, #000 50%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, #000 50%, transparent 100%)",
          }}
        >
          {/* Column 1 */}
          <div className="flex flex-col gap-[10px]">
            {col1.map((t, i) => (
              <TestimonialCard key={`c1-${i}`} item={t} />
            ))}
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-[10px]">
            {col2.map((t, i) => (
              <TestimonialCard key={`c2-${i}`} item={t} />
            ))}
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-[10px]">
            {col3.map((t, i) => (
              <TestimonialCard key={`c3-${i}`} item={t} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
