"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowRight, Monitor, Globe } from "lucide-react";
import Link from "next/link";
import React from "react";

import { useToast } from "./ui/ActionToast";

export function CtaSection() {
  const showToast = useToast();

  function handleDownload() {
    showToast("Download link copied! Check your clipboard.");
  }

  return (
    <section className="relative py-20">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgb(var(--brand-primary-rgb) / 0.06), transparent 80%)",
        }}
      />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <h2 className="font-heading mb-4 text-3xl font-semibold tracking-[-0.02em] text-white md:text-5xl">
            Ready to run cleaner meetings?
          </h2>
          <p className="mb-10 max-w-xl text-lg leading-relaxed text-zinc-400">
            Start with the desktop app for local capture, or jump into the web
            dashboard for review and sync. Both paths lead to the same clean
            follow-up.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Button
              size="lg"
              radius="full"
              className="brand-button-primary button-shine group h-12 px-8 text-md font-semibold"
              onPress={handleDownload}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Download Desktop App
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Link
              href="/dashboard"
              className="brand-button-secondary button-shine flex h-12 items-center justify-center rounded-full px-8 text-md font-semibold"
            >
              <Globe className="mr-2 h-4 w-4" />
              Open Web Dashboard
            </Link>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            Free to start · No credit card required · Works on macOS, Windows &amp; Linux
          </p>
        </motion.div>
      </div>
    </section>
  );
}
