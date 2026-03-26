"use client";

import { motion } from "framer-motion";
import { Check, SlidersHorizontal, X } from "lucide-react";
import React from "react";

const comparisonRows = [
  { feature: "Guided Start Session launcher", simple: true, advanced: true },
  { feature: "Clean meeting review surface", simple: true, advanced: true },
  { feature: "Post-meeting summary and tasks", simple: true, advanced: true },
  { feature: "Quick start and low-friction sync", simple: true, advanced: true },
  { feature: "AI status rail and stage history", simple: false, advanced: true },
  { feature: "Targeted summary, task, and draft reruns", simple: false, advanced: true },
  { feature: "Memory context and export control", simple: false, advanced: true },
  { feature: "Operator diagnostics and artifact controls", simple: false, advanced: true },
];

export function ModesComparison() {
  return (
    <section className="relative overflow-hidden border-t border-white/5 bg-transparent py-24">
      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading mb-4 text-3xl font-bold text-white md:text-5xl"
          >
            Keep it simple or open the full operator view
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg text-zinc-400"
          >
            NextStop is designed for both guided daily use and deeper meeting
            control. Simple mode keeps the workflow approachable. Advanced mode
            exposes the richer review and regeneration surface when teams need it.
          </motion.p>
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/8 bg-zinc-950/60 hover-border-gradient"
        >
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="w-1/2">Feature</th>
                <th className="w-1/4 text-center">
                  Simple
                  <span className="ml-2 text-[10px] font-normal normal-case tracking-normal text-zinc-500">
                    Starter
                  </span>
                </th>
                <th className="w-1/4 text-center">
                  Advanced
                  <span
                    className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-black"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, var(--brand-primary), var(--brand-highlight))",
                    }}
                  >
                    Pro
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature}>
                  <td className="text-sm text-zinc-300">{row.feature}</td>
                  <td className="text-center">
                    {row.simple ? (
                      <Check className="mx-auto h-4 w-4" style={{ color: "var(--brand-trust)" }} />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-zinc-600" />
                    )}
                  </td>
                  <td className="text-center">
                    {row.advanced ? (
                      <Check className="mx-auto h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-zinc-600" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Footer note */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto mt-6 max-w-3xl rounded-xl border border-white/6 bg-zinc-950/60 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "rgb(var(--brand-primary-rgb) / 0.14)",
                color: "var(--brand-highlight)",
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm text-zinc-300">
                <span className="font-medium text-white">Starter</span> keeps
                the experience guided.{" "}
                <span className="font-medium text-white">Pro</span> adds the
                advanced toggle.{" "}
                <span className="font-medium text-white">Team</span> unlocks
                advanced for all seats.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
