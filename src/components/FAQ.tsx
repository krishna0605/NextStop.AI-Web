"use client";

import { Accordion, AccordionItem } from "@heroui/react";
import React from "react";

const faqs = [
  {
    question: "Is NextStop a desktop app?",
    answer:
      "Yes. NextStop is designed as a desktop workspace for meeting capture, review, and follow-up. The local app handles recording, transcript storage, settings, and session control.",
  },
  {
    question: "Does my audio leave my laptop?",
    answer:
      "Audio is captured and stored locally first. After the meeting ends, NextStop can send a finalized meeting package to your secure gateway for post-meeting AI analysis, but it does not stream live microphone audio to OpenAI during the meeting.",
  },
  {
    question: "Does OpenAI run live during meetings?",
    answer:
      "No. The current production plan is post-meeting only. Live capture and transcript handling happen in the desktop flow, and the AI pipeline starts after the meeting is completed.",
  },
  {
    question: "What happens after a meeting ends?",
    answer:
      "NextStop can queue the meeting for structured extraction, final synthesis, related-meeting memory, targeted regeneration, draft generation, and export or sync actions such as Notion-ready markdown.",
  },
  {
    question: "Does it work with Google Meet, Teams, Zoom, or Webex?",
    answer:
      "Yes. You can record existing meetings across common conferencing tools, and the desktop product roadmap also includes direct Google Calendar and Google Meet creation inside the workflow.",
  },
  {
    question: "Can different users keep the app simple or advanced?",
    answer:
      "Yes. The product plan includes dual UI modes: a Simple mode for guided, low-friction actions and an Advanced mode for power users who want the full review, diagnostics, and control surfaces.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative bg-transparent py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-zinc-400">
            The core trust model, workflow, and platform behavior in one place.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion
            variant="splitted"
            itemClasses={{
              base: "group relative mb-4 overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/80 px-6 py-2 shadow-none transition-all duration-500 data-[open=true]:border-[rgb(var(--brand-primary-rgb)/0.3)] data-[open=true]:bg-[rgb(var(--brand-primary-rgb)/0.08)] data-[open=true]:shadow-[0_0_32px_-16px_rgb(var(--brand-primary-rgb)/0.28)]",
              title:
                "text-lg font-medium text-zinc-300 transition-colors group-hover:text-white group-data-[open=true]:text-[var(--brand-highlight)]",
              content: "relative z-10 px-0 pb-5 pt-1 leading-relaxed text-zinc-400",
              indicator:
                "text-zinc-500 transition-colors group-data-[open=true]:text-[var(--brand-primary)]",
            }}
          >
            {faqs.map((faq, index) => (
              <AccordionItem key={index} aria-label={faq.question} title={faq.question}>
                <p className="m-0 max-w-[95%] text-zinc-400">{faq.answer}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
